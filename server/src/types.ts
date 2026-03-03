export type ConfidenceTier = 'critical' | 'high' | 'medium' | 'low';

export type PiiCategory =
  | 'identity'
  | 'contact'
  | 'personal'
  | 'financial'
  | 'digital'
  | 'medical'
  | 'biometric'
  | 'authentication';

export interface ParsedColumn {
  name: string;
  dataType: string;
  fullDefinition: string;
}

export interface ParsedTable {
  tableName: string;
  columns: ParsedColumn[];
  raw: string;
}

export interface PiiPattern {
  regex: RegExp;
  tier: ConfidenceTier;
  category: PiiCategory;
  label: string;
  dataTypeRequire?: RegExp;
  dataTypeExclude?: RegExp;
  dataTypeBoost?: RegExp;
}

export interface TableColumnOverride {
  table: string;
  column: string;
  tier: ConfidenceTier;
  category: PiiCategory;
  label: string;
}

export interface PiiMatch {
  pattern: string;
  tier: ConfidenceTier;
  category: PiiCategory;
  label: string;
  matchedOn: 'name' | 'name+type' | 'override' | 'confluence';
}

export interface ConfluenceConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  pageId: string;
}

export interface PiiColumn {
  columnName: string;
  dataType: string;
  fullDefinition: string;
  matches: PiiMatch[];
  highestTier: ConfidenceTier;
  primaryCategory: PiiCategory;
}

export interface TableResult {
  tableName: string;
  filePath: string;
  totalColumns: number;
  piiColumns: PiiColumn[];
}

export interface LocationInfo {
  cluster: string;
  connection: string;
  region: string;
  instance: string;
  database: string;
}

export interface DatabaseResult {
  location: LocationInfo;
  displayPath: string;
  tables: TableResult[];
  totalPiiColumns: number;
}

export interface ScanSummary {
  totalFilesScanned: number;
  totalTablesWithPii: number;
  totalPiiColumns: number;
  byTier: Record<ConfidenceTier, number>;
  byCategory: Record<PiiCategory, number>;
  scanDurationMs: number;
}

export interface ScanResponse {
  databases: DatabaseResult[];
  summary: ScanSummary;
  confluenceActive?: boolean;
}

// ===== Teleport Types =====

export interface TeleportTunnel {
  process: import('child_process').ChildProcess;
  host: string;
  port: number;
  dbName: string;
  dbUser: string;
}

export interface TeleportInstance {
  name: string;
  uri: string;
  accountId: string;
  region: string;
  instanceId: string;
}

export interface TeleportStatus {
  loggedIn: boolean;
  username: string;
  cluster?: string;
}

export type LiveScanEvent =
  | { type: 'progress'; message: string }
  | { type: 'database_result'; database: DatabaseResult; partialSummary: ScanSummary }
  | { type: 'error'; message: string; database?: string }
  | { type: 'done'; summary: ScanSummary; confluenceActive: boolean };
