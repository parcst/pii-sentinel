import { Router, Request, Response } from 'express';
import { toCSV } from '../services/exporter.js';
import { DatabaseResult } from '../types.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { databases } = req.body as { databases: DatabaseResult[] };

  if (!databases || !Array.isArray(databases)) {
    res.status(400).json({ error: 'databases array is required' });
    return;
  }

  try {
    const csv = toCSV(databases);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="pii-scan-results.csv"');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Export failed' });
  }
});

export default router;
