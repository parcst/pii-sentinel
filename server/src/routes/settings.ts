import { Router, Request, Response } from 'express';
import { loadConfig, saveConfig, clearConfluenceConfig } from '../services/config-store.js';
import { resolveConfluenceConfig } from '../services/confluence-config.js';
import { fetchConfluencePage, parseConfluenceTable } from '../services/confluence-overrides.js';
import { ConfluenceConfig } from '../types.js';

const router = Router();

/** GET /api/settings/confluence — current status */
router.get('/confluence', async (_req: Request, res: Response) => {
  try {
    const resolved = await resolveConfluenceConfig();
    if (!resolved) {
      res.json({ configured: false });
      return;
    }

    const { config, source } = resolved;
    res.json({
      configured: true,
      source,
      pageUrl: `${config.baseUrl}/wiki/spaces/unknown/pages/${config.pageId}`,
      email: config.email,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/settings/confluence — save config to file */
router.put('/confluence', async (req: Request, res: Response) => {
  try {
    const { baseUrl, email, apiToken, pageId } = req.body;
    if (!baseUrl || !email || !apiToken || !pageId) {
      res.status(400).json({ error: 'All fields are required: baseUrl, email, apiToken, pageId' });
      return;
    }

    const config = await loadConfig();
    config.confluence = { baseUrl, email, apiToken, pageId };
    await saveConfig(config);

    res.json({ saved: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/settings/confluence — remove file config */
router.delete('/confluence', async (_req: Request, res: Response) => {
  try {
    await clearConfluenceConfig();
    res.json({ removed: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/settings/confluence/test — test connection */
router.post('/confluence/test', async (req: Request, res: Response) => {
  try {
    const { baseUrl, email, apiToken, pageId } = req.body;
    if (!baseUrl || !email || !apiToken || !pageId) {
      res.status(400).json({ error: 'All fields are required: baseUrl, email, apiToken, pageId' });
      return;
    }

    const config: ConfluenceConfig = { baseUrl, email, apiToken, pageId };
    const html = await fetchConfluencePage(config);
    const overrides = parseConfluenceTable(html);

    res.json({ success: true, overrideCount: overrides.length });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

/** POST /api/settings/confluence/validate — test the currently resolved config */
router.post('/confluence/validate', async (_req: Request, res: Response) => {
  try {
    const resolved = await resolveConfluenceConfig();
    if (!resolved) {
      res.json({ success: false, error: 'No Confluence configuration found' });
      return;
    }

    const html = await fetchConfluencePage(resolved.config);
    const overrides = parseConfluenceTable(html);

    res.json({ success: true, overrideCount: overrides.length, source: resolved.source });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

export default router;
