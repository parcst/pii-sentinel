import type { BrowseResponse, ValidatePathResponse, ScanResponse, DatabaseResult, TeleportInstance, TeleportStatus, ConfluenceStatus, ConfluenceTestResult } from './types';

async function post<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function put<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function del<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function browse(path?: string): Promise<BrowseResponse> {
  return post('/api/browse', { path });
}

export function validatePath(path: string): Promise<ValidatePathResponse> {
  return post('/api/validate-path', { path });
}

export function scan(path: string): Promise<ScanResponse> {
  return post('/api/scan', { path });
}

export async function exportCSV(databases: DatabaseResult[]): Promise<void> {
  const res = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ databases }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Export failed');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pii-scan-results.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ===== Teleport API =====

export function teleportStatus(): Promise<{ available: boolean; tshPath: string | null }> {
  return get('/api/teleport/status');
}

export function teleportClusters(): Promise<{ clusters: string[] }> {
  return get('/api/teleport/clusters');
}

export function teleportLoginStatus(cluster?: string): Promise<TeleportStatus> {
  const params = cluster ? `?cluster=${encodeURIComponent(cluster)}` : '';
  return get(`/api/teleport/login-status${params}`);
}

export function teleportLogin(cluster: string): Promise<{ started: boolean }> {
  return post('/api/teleport/login', { cluster });
}

export function teleportInstances(cluster: string): Promise<{ instances: TeleportInstance[] }> {
  return get(`/api/teleport/instances?cluster=${encodeURIComponent(cluster)}`);
}

export function teleportDatabases(cluster: string, instance: string): Promise<{ databases: string[] }> {
  return post('/api/teleport/databases', { cluster, instance });
}

export function teleportScanUrl(cluster: string, instance: string, databases: string[]): string {
  const params = new URLSearchParams({
    cluster,
    instance,
    databases: databases.join(','),
  });
  return `/api/teleport/scan?${params.toString()}`;
}

export function teleportCancel(): Promise<{ cancelled: boolean }> {
  return post('/api/teleport/cancel', {});
}

// ===== Settings API =====

export function getConfluenceStatus(): Promise<ConfluenceStatus> {
  return get('/api/settings/confluence');
}

/**
 * Parse a Confluence page URL into baseUrl + pageId.
 * Accepts: https://org.atlassian.net/wiki/spaces/SPACE/pages/123456789/Page+Title
 */
export function parseConfluenceUrl(url: string): { baseUrl: string; pageId: string } | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/wiki\/.*?\/pages\/(\d+)/);
    if (!match) return null;
    return {
      baseUrl: `${parsed.protocol}//${parsed.host}`,
      pageId: match[1],
    };
  } catch {
    return null;
  }
}

export function saveConfluenceConfig(config: { baseUrl: string; email: string; apiToken: string; pageId: string }): Promise<{ saved: boolean }> {
  return put('/api/settings/confluence', config);
}

export function removeConfluenceConfig(): Promise<{ removed: boolean }> {
  return del('/api/settings/confluence');
}

export function testConfluenceConnection(config: { baseUrl: string; email: string; apiToken: string; pageId: string }): Promise<ConfluenceTestResult> {
  return post('/api/settings/confluence/test', config);
}

export function validateConfluenceConnection(): Promise<ConfluenceTestResult & { source?: string }> {
  return post('/api/settings/confluence/validate', {});
}
