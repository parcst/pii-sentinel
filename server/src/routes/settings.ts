import { Router, Request, Response } from 'express';
import { loadConfig, saveConfig, clearConfluenceConfig, clearJiraConfig } from '../services/config-store.js';
import { resolveConfluenceConfig } from '../services/confluence-config.js';
import { fetchConfluencePage, parseConfluenceTable } from '../services/confluence-overrides.js';
import { resolveJiraConfig } from '../services/jira-config.js';
import { validateJiraConnection } from '../services/jira-service.js';
import { ConfluenceConfig, JiraConfig } from '../types.js';

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

// ===== Jira Settings =====

/** GET /api/settings/jira — current status */
router.get('/jira', async (_req: Request, res: Response) => {
  try {
    const resolved = await resolveJiraConfig();

    // Include Confluence credentials if available, so the client can pre-populate
    let confluenceCredentials: { baseUrl: string; email: string } | undefined;
    const confluenceResolved = await resolveConfluenceConfig();
    if (confluenceResolved) {
      confluenceCredentials = {
        baseUrl: confluenceResolved.config.baseUrl,
        email: confluenceResolved.config.email,
      };
    }

    if (!resolved) {
      res.json({ configured: false, confluenceCredentials });
      return;
    }

    const { config, source } = resolved;
    res.json({
      configured: true,
      source,
      baseUrl: config.baseUrl,
      email: config.email,
      projectKeys: config.projectKeys,
      confluenceCredentials,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/settings/jira — save config to file */
router.put('/jira', async (req: Request, res: Response) => {
  try {
    const { baseUrl, email, apiToken, projectKey1, projectKey2 } = req.body;
    if (!baseUrl || !email || !projectKey1) {
      res.status(400).json({ error: 'Required fields: baseUrl, email, projectKey1' });
      return;
    }

    // If no API token provided, try to reuse Confluence's token
    let resolvedToken = apiToken;
    if (!resolvedToken) {
      const confluenceResolved = await resolveConfluenceConfig();
      resolvedToken = confluenceResolved?.config.apiToken;
    }
    if (!resolvedToken) {
      res.status(400).json({ error: 'API token is required (no Confluence token available to share)' });
      return;
    }

    const projectKeys = [projectKey1 as string];
    if (projectKey2) projectKeys.push(projectKey2);

    const config = await loadConfig();
    config.jira = { baseUrl, email, apiToken: resolvedToken, projectKeys };
    await saveConfig(config);

    res.json({ saved: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/settings/jira — remove file config */
router.delete('/jira', async (_req: Request, res: Response) => {
  try {
    await clearJiraConfig();
    res.json({ removed: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/settings/jira/test — test connection with provided credentials */
router.post('/jira/test', async (req: Request, res: Response) => {
  try {
    const { baseUrl, email, apiToken, projectKey1, projectKey2 } = req.body;
    if (!baseUrl || !email || !projectKey1) {
      res.status(400).json({ error: 'Required fields: baseUrl, email, projectKey1' });
      return;
    }

    // If no API token provided, try to reuse Confluence's token
    let resolvedToken = apiToken;
    if (!resolvedToken) {
      const confluenceResolved = await resolveConfluenceConfig();
      resolvedToken = confluenceResolved?.config.apiToken;
    }
    if (!resolvedToken) {
      res.json({ success: false, error: 'API token is required (no Confluence token available to share)' });
      return;
    }

    const projectKeys = [projectKey1 as string];
    if (projectKey2) projectKeys.push(projectKey2);

    const config: JiraConfig = { baseUrl, email, apiToken: resolvedToken, projectKeys };
    const result = await validateJiraConnection(config);
    res.json(result);
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

/** POST /api/settings/jira/validate — test the currently resolved config */
router.post('/jira/validate', async (_req: Request, res: Response) => {
  try {
    const resolved = await resolveJiraConfig();
    if (!resolved) {
      res.json({ success: false, error: 'No Jira configuration found' });
      return;
    }

    const result = await validateJiraConnection(resolved.config);
    res.json({ ...result, source: resolved.source });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

export default router;
