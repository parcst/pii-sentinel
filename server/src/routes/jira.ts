import { Router, Request, Response } from 'express';
import { resolveJiraConfig } from '../services/jira-config.js';
import { createJiraTickets, verifyJiraTicketExists } from '../services/jira-service.js';
import { loadJiraTickets, saveJiraTickets, findExistingTicket } from '../services/jira-tickets-store.js';
import { getOsUsername } from '../services/exclusion-store.js';

const router = Router();

/** POST /api/jira/create-ticket — create tickets on both boards */
router.post('/create-ticket', async (req: Request, res: Response) => {
  try {
    const { table, column, dataType, tier, category, location } = req.body;
    if (!table || !column || !dataType || !tier || !category || !location) {
      res.status(400).json({ error: 'Missing required fields: table, column, dataType, tier, category, location' });
      return;
    }

    const resolved = await resolveJiraConfig();
    if (!resolved) {
      res.status(400).json({ error: 'Jira is not configured' });
      return;
    }

    // Check dedup
    const tickets = await loadJiraTickets();
    const existing = findExistingTicket(tickets, table, column);
    if (existing) {
      res.json({
        ticketKeys: existing.ticketKeys,
        ticketUrls: existing.ticketUrls,
        alreadyExists: true,
      });
      return;
    }

    const reportedBy = getOsUsername();
    const result = await createJiraTickets(resolved.config, {
      table,
      column,
      dataType,
      tier,
      category,
      location,
      reportedBy,
    });

    // Save tracking entry
    tickets.push({
      table,
      column,
      ticketKeys: result.ticketKeys,
      ticketUrls: result.ticketUrls,
      createdBy: reportedBy,
      createdAt: new Date().toISOString(),
    });
    await saveJiraTickets(tickets);

    res.json({
      ticketKeys: result.ticketKeys,
      ticketUrls: result.ticketUrls,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/jira/tickets — list all tracked tickets */
router.get('/tickets', async (_req: Request, res: Response) => {
  try {
    const tickets = await loadJiraTickets();
    res.json({ tickets });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/jira/verify-ticket — check if tracked tickets still exist, remove if deleted */
router.post('/verify-ticket', async (req: Request, res: Response) => {
  try {
    const { table, column } = req.body;
    if (!table || !column) {
      res.status(400).json({ error: 'Missing required fields: table, column' });
      return;
    }

    const resolved = await resolveJiraConfig();
    if (!resolved) {
      res.status(400).json({ error: 'Jira is not configured' });
      return;
    }

    const tickets = await loadJiraTickets();
    const entry = findExistingTicket(tickets, table, column);
    if (!entry) {
      res.json({ exists: false, removed: false });
      return;
    }

    // Check if ALL ticket keys still exist — if any is deleted, remove the entry
    const checks = await Promise.all(
      entry.ticketKeys.map((key) => verifyJiraTicketExists(resolved.config, key))
    );
    const allExist = checks.every(Boolean);

    if (!allExist) {
      // Remove the entry from tracking
      const updated = tickets.filter(
        (t) => !(t.table === table && t.column === column)
      );
      await saveJiraTickets(updated);
      res.json({ exists: false, removed: true });
      return;
    }

    res.json({ exists: true, removed: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
