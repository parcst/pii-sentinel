import { JiraConfig } from '../types.js';
import { loadConfig } from './config-store.js';

export type ConfigSource = 'env' | 'file';

export interface ResolvedJiraConfig {
  config: JiraConfig;
  source: ConfigSource;
}

/**
 * Resolve Jira config with priority: file config > env vars > null.
 * File config takes priority so that UI-saved settings override .env.
 */
export async function resolveJiraConfig(): Promise<ResolvedJiraConfig | null> {
  // Priority 1: file config (UI-saved, overrides env)
  const fileConfig = await loadConfig();
  if (fileConfig.jira) {
    return {
      config: fileConfig.jira,
      source: 'file',
    };
  }

  // Priority 2: env vars (base + email + token + at least one project key)
  const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY_1, JIRA_PROJECT_KEY_2 } = process.env;
  if (JIRA_BASE_URL && JIRA_EMAIL && JIRA_API_TOKEN && JIRA_PROJECT_KEY_1) {
    const projectKeys = [JIRA_PROJECT_KEY_1];
    if (JIRA_PROJECT_KEY_2) projectKeys.push(JIRA_PROJECT_KEY_2);
    return {
      config: {
        baseUrl: JIRA_BASE_URL,
        email: JIRA_EMAIL,
        apiToken: JIRA_API_TOKEN,
        projectKeys,
      },
      source: 'env',
    };
  }

  return null;
}
