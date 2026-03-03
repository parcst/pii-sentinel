import { Router } from 'express';
import { loadExclusions, saveExclusions, getOsUsername } from '../services/exclusion-store.js';
import type { ExclusionEntry } from '../services/exclusion-store.js';

const router = Router();

// GET /api/exclusions — list all exclusions + current username
router.get('/', async (_req, res) => {
  try {
    const exclusions = await loadExclusions();
    const username = getOsUsername();
    res.json({ exclusions, username });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/exclusions — add one exclusion (deduplicates by table+column+scope)
router.post('/', async (req, res) => {
  try {
    const { table, column, scope } = req.body as { table: string; column: string; scope: string };
    if (!table || !column || !scope) {
      return res.status(400).json({ error: 'table, column, and scope are required' });
    }

    const exclusions = await loadExclusions();
    const exists = exclusions.some(
      (e) => e.table === table && e.column === column && e.scope === scope
    );
    if (!exists) {
      const entry: ExclusionEntry = {
        table,
        column,
        scope,
        excludedBy: getOsUsername(),
        excludedAt: new Date().toISOString(),
      };
      exclusions.push(entry);
      await saveExclusions(exclusions);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/exclusions/all — clear all exclusions (registered before /)
router.delete('/all', async (_req, res) => {
  try {
    await saveExclusions([]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/exclusions — remove one exclusion by table+column+scope
router.delete('/', async (req, res) => {
  try {
    const { table, column, scope } = req.body as { table: string; column: string; scope: string };
    if (!table || !column || !scope) {
      return res.status(400).json({ error: 'table, column, and scope are required' });
    }

    const exclusions = await loadExclusions();
    const filtered = exclusions.filter(
      (e) => !(e.table === table && e.column === column && e.scope === scope)
    );
    await saveExclusions(filtered);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
