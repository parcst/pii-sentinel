import { ConfluenceConfig } from '../types.js';
import { loadConfig } from './config-store.js';

export type ConfigSource = 'env' | 'file';

export interface ResolvedConfluenceConfig {
  config: ConfluenceConfig;
  source: ConfigSource;
}

/**
 * Resolve Confluence config with priority: env vars > file config > null.
 */
export async function resolveConfluenceConfig(): Promise<ResolvedConfluenceConfig | null> {
  // Priority 1: env vars (all four must be set)
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

  // Priority 2: file config
  const fileConfig = await loadConfig();
  if (fileConfig.confluence) {
    return {
      config: fileConfig.confluence,
      source: 'file',
    };
  }

  return null;
}
