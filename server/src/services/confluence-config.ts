import { ConfluenceConfig } from '../types.js';
import { loadConfig } from './config-store.js';

export type ConfigSource = 'env' | 'file';

export interface ResolvedConfluenceConfig {
  config: ConfluenceConfig;
  source: ConfigSource;
}

/**
 * Resolve Confluence config with priority: file config > env vars > null.
 * File config takes priority so that UI-saved settings override .env.
 */
export async function resolveConfluenceConfig(): Promise<ResolvedConfluenceConfig | null> {
  // Priority 1: file config (UI-saved, overrides env)
  const fileConfig = await loadConfig();
  if (fileConfig.confluence) {
    return {
      config: fileConfig.confluence,
      source: 'file',
    };
  }

  // Priority 2: env vars (all four must be set)
  const { CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN, CONFLUENCE_PAGE_ID } = process.env;
  if (CONFLUENCE_BASE_URL && CONFLUENCE_EMAIL && CONFLUENCE_API_TOKEN && CONFLUENCE_PAGE_ID) {
    return {
      config: {
        baseUrl: CONFLUENCE_BASE_URL,
        email: CONFLUENCE_EMAIL,
        apiToken: CONFLUENCE_API_TOKEN,
        pageId: CONFLUENCE_PAGE_ID,
      },
      source: 'env',
    };
  }

  return null;
}
