import { Router, Request, Response } from 'express';
import { findTsh, getClusters, getLoginStatus, loginToCluster, listMysqlInstances, cleanupAll } from '../services/teleport.js';
import { liveScan, discoverDatabases } from '../services/live-scanner.js';
import { fetchDataSample } from '../services/data-sample.js';

const router = Router();

// Track the active SSE scan so it can be cancelled
let activeScanAbort: AbortController | null = null;

/**
 * GET /api/teleport/status
 * Check if tsh binary is available.
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const tshPath = await findTsh();
    res.json({ available: true, tshPath });
  } catch {
    res.json({ available: false, tshPath: null });
  }
});

/**
 * GET /api/teleport/clusters
 * List clusters from ~/.tsh/*.yaml.
 */
router.get('/clusters', async (_req: Request, res: Response) => {
  try {
    const clusters = await getClusters();
    res.json({ clusters });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/teleport/login-status?cluster=X
 * Check login status for a cluster.
 */
router.get('/login-status', async (req: Request, res: Response) => {
  try {
    const cluster = req.query.cluster as string | undefined;
    const tsh = await findTsh();
    const status = await getLoginStatus(tsh, cluster);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/teleport/login
 * Start SSO login (opens browser).
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { cluster } = req.body;
    if (!cluster) {
      res.status(400).json({ error: 'cluster is required' });
      return;
    }
    const tsh = await findTsh();
    const proc = loginToCluster(tsh, cluster);

    // Fire and forget — the client will poll login-status
    proc.on('exit', () => {});
    proc.on('error', () => {});

    res.json({ started: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/teleport/instances?cluster=X
 * List MySQL instances on a cluster.
 */
router.get('/instances', async (req: Request, res: Response) => {
  try {
    const cluster = req.query.cluster as string;
    if (!cluster) {
      res.status(400).json({ error: 'cluster query param is required' });
      return;
    }
    const tsh = await findTsh();
    const instances = await listMysqlInstances(tsh, cluster);
    res.json({ instances });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/teleport/databases
 * Discover databases on an instance (opens temp tunnel).
 */
router.post('/databases', async (req: Request, res: Response) => {
  try {
    const { cluster, instance } = req.body;
    if (!cluster || !instance) {
      res.status(400).json({ error: 'cluster and instance are required' });
      return;
    }
    const databases = await discoverDatabases(cluster, instance);
    res.json({ databases });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/teleport/scan?cluster=X&instance=Y&databases=a,b,c
 * SSE stream of live PII scan results.
 */
router.get('/scan', async (req: Request, res: Response) => {
  const cluster = req.query.cluster as string;
  const instance = req.query.instance as string;
  const databasesParam = req.query.databases as string;

  if (!cluster || !instance || !databasesParam) {
    res.status(400).json({ error: 'cluster, instance, and databases query params are required' });
    return;
  }

  const databases = databasesParam.split(',').filter(Boolean);
  if (databases.length === 0) {
    res.status(400).json({ error: 'At least one database is required' });
    return;
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Set up abort controller for cancellation
  const abort = new AbortController();
  activeScanAbort = abort;

  // Cancel on client disconnect
  req.on('close', () => {
    abort.abort();
  });

  try {
    for await (const event of liveScan({ cluster, instance, databases, signal: abort.signal })) {
      if (abort.signal.aborted) break;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  } catch (err: any) {
    if (!abort.signal.aborted) {
      const errorEvent = { type: 'error', message: err.message };
      res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
    }
  } finally {
    if (activeScanAbort === abort) {
      activeScanAbort = null;
    }
    res.end();
  }
});

/**
 * POST /api/teleport/data-sample
 * Fetch a small sample of rows for a specific PII column.
 */
router.post('/data-sample', async (req: Request, res: Response) => {
  try {
    const { cluster, instance, database, table, column, pkColumn } = req.body;
    if (!cluster || !instance || !database || !table || !column || !pkColumn) {
      res.status(400).json({ error: 'cluster, instance, database, table, column, and pkColumn are required' });
      return;
    }
    const result = await fetchDataSample({ cluster, instance, database, table, column, pkColumn });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/teleport/cancel
 * Cancel the active SSE scan.
 */
router.post('/cancel', (_req: Request, res: Response) => {
  if (activeScanAbort) {
    activeScanAbort.abort();
    activeScanAbort = null;
    res.json({ cancelled: true });
  } else {
    res.json({ cancelled: false, message: 'No active scan' });
  }
});

/**
 * POST /api/teleport/shutdown
 * Abort any active scan and clean up all tunnels.
 * Target for navigator.sendBeacon on page close.
 */
router.post('/shutdown', async (_req: Request, res: Response) => {
  if (activeScanAbort) {
    activeScanAbort.abort();
    activeScanAbort = null;
  }
  await cleanupAll();
  res.json({ ok: true });
});

export default router;
