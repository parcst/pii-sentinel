import type { BrowseResponse, ValidatePathResponse, ScanResponse, DatabaseResult, TeleportInstance, TeleportStatus } from './types';

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
