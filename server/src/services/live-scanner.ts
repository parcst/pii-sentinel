import mysql from 'mysql2/promise';
import {
  ConfidenceTier,
  ConfluenceConfig,
  DatabaseResult,
  LiveScanEvent,
  LocationInfo,
  PiiCategory,
  ScanSummary,
  TableColumnOverride,
  TableResult,
  TeleportInstance,
} from '../types.js';
import { findTsh, getLoginStatus, listMysqlInstances, startTunnel, stopTunnel, registerTunnel, unregisterTunnel } from './teleport.js';
import { parseCreateTable } from './parser.js';
import { analyzeTable } from './pii-detector.js';
import { TABLE_COLUMN_OVERRIDES, mergeOverrides } from './pii-overrides.js';
import { loadConfluenceOverrides } from './confluence-overrides.js';

const SYSTEM_SCHEMAS = new Set([
  'information_schema',
  'mysql',
  'performance_schema',
  'sys',
]);

export interface LiveScanOptions {
  cluster: string;
  instance: string;
  databases: string[];
  signal?: AbortSignal;
}

/**
 * Async generator that streams LiveScanEvents for a live database scan.
 * Connects to the specified instance via Teleport tunnel, queries each
 * database's tables, and feeds DDL through the existing parser + analyzer.
 */
export async function* liveScan(options: LiveScanOptions): AsyncGenerator<LiveScanEvent> {
  const { cluster, instance, databases, signal } = options;
  const startTime = Date.now();

  let tsh: string;
  let tunnel: { process: import('child_process').ChildProcess; host: string; port: number; dbName: string; dbUser: string } | null = null;
  let connection: mysql.Connection | null = null;

  try {
    // Step 1: Find tsh and get SSO email
    yield { type: 'progress', message: 'Finding tsh binary...' };
    tsh = await findTsh();

    yield { type: 'progress', message: 'Getting login status...' };
    const status = await getLoginStatus(tsh, cluster);
    if (!status.loggedIn || !status.username) {
      yield { type: 'error', message: 'Not logged in to Teleport. Please log in first.' };
      return;
    }
    const dbUser = status.username;

    // Step 2: Load Confluence overrides (same as directory scan)
    yield { type: 'progress', message: 'Loading overrides...' };
    let confluenceActive = false;
    let overrideMap: Map<string, TableColumnOverride[]> | undefined;

    const { CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN, CONFLUENCE_PAGE_ID } = process.env;
    if (CONFLUENCE_BASE_URL && CONFLUENCE_EMAIL && CONFLUENCE_API_TOKEN && CONFLUENCE_PAGE_ID) {
      const config: ConfluenceConfig = {
        baseUrl: CONFLUENCE_BASE_URL,
        email: CONFLUENCE_EMAIL,
        apiToken: CONFLUENCE_API_TOKEN,
        pageId: CONFLUENCE_PAGE_ID,
      };
      const confluenceOverrides = await loadConfluenceOverrides(config);
      overrideMap = mergeOverrides(TABLE_COLUMN_OVERRIDES, confluenceOverrides);
      confluenceActive = confluenceOverrides.length > 0;
    }

    // Step 3: Look up instance metadata
    yield { type: 'progress', message: `Looking up instance ${instance}...` };
    const instances = await listMysqlInstances(tsh, cluster);
    const instanceMeta = instances.find(i => i.name === instance);

    // Step 4: Open tunnel
    if (signal?.aborted) return;
    yield { type: 'progress', message: `Opening tunnel to ${instance}...` };
    tunnel = await startTunnel(tsh, instance, dbUser, cluster);
    registerTunnel(tunnel);

    // Step 5: Connect to MySQL
    yield { type: 'progress', message: 'Connecting to MySQL...' };
    connection = await mysql.createConnection({
      host: tunnel.host,
      port: tunnel.port,
      user: tunnel.dbUser,
      database: 'information_schema',
      connectTimeout: 10_000,
    });

    // Step 6: Scan each database
    const allDatabases: DatabaseResult[] = [];
    let totalFilesScanned = 0;
    let totalTablesWithPii = 0;
    let totalPiiColumns = 0;
    const byTier: Record<ConfidenceTier, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    const byCategory: Record<PiiCategory, number> = {
      identity: 0, contact: 0, personal: 0, financial: 0,
      digital: 0, medical: 0, biometric: 0, authentication: 0,
    };

    for (const dbName of databases) {
      if (signal?.aborted) return;

      yield { type: 'progress', message: `Scanning database: ${dbName}...` };

      try {
        // Get table list
        const [tableRows] = await connection.query<mysql.RowDataPacket[]>(
          'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ?',
          [dbName, 'BASE TABLE'],
        );

        const tables: TableResult[] = [];
        for (const row of tableRows) {
          if (signal?.aborted) return;
          const tableName = row.TABLE_NAME;
          try {
            const [ddlRows] = await connection.query<mysql.RowDataPacket[]>(
              `SHOW CREATE TABLE \`${dbName}\`.\`${tableName}\``,
            );
            const ddl = ddlRows[0]?.['Create Table'] ?? '';
            if (!ddl) continue;

            totalFilesScanned++;
            const parsed = parseCreateTable(ddl);
            const result = analyzeTable(parsed, `live://${instance}/${dbName}/${tableName}`, overrideMap);
            if (result) {
              tables.push(result);
            }
          } catch (tableErr: any) {
            // Individual table errors are non-fatal
            console.warn(`Error scanning ${dbName}.${tableName}: ${tableErr.message}`);
          }
        }

        // Build location info from instance metadata
        const location: LocationInfo = {
          cluster: cluster,
          connection: instanceMeta?.name ?? instance,
          region: instanceMeta?.region ?? '',
          instance: instanceMeta?.instanceId ?? instance,
          database: dbName,
        };
        const displayPath = `${location.cluster}/${location.connection}/${location.region}/${location.instance}/${dbName}`;

        tables.sort((a, b) => a.tableName.localeCompare(b.tableName));
        const dbTotalPii = tables.reduce((sum, t) => sum + t.piiColumns.length, 0);

        const dbResult: DatabaseResult = {
          location,
          displayPath,
          tables,
          totalPiiColumns: dbTotalPii,
        };

        allDatabases.push(dbResult);

        // Update running totals
        for (const table of tables) {
          totalTablesWithPii++;
          for (const col of table.piiColumns) {
            totalPiiColumns++;
            byTier[col.highestTier]++;
            byCategory[col.primaryCategory]++;
          }
        }

        const partialSummary: ScanSummary = {
          totalFilesScanned,
          totalTablesWithPii,
          totalPiiColumns,
          byTier: { ...byTier },
          byCategory: { ...byCategory },
          scanDurationMs: Date.now() - startTime,
        };

        yield { type: 'database_result', database: dbResult, partialSummary };
      } catch (dbErr: any) {
        yield { type: 'error', message: dbErr.message, database: dbName };
      }
    }

    // Step 7: Yield final done event
    const finalSummary: ScanSummary = {
      totalFilesScanned,
      totalTablesWithPii,
      totalPiiColumns,
      byTier: { ...byTier },
      byCategory: { ...byCategory },
      scanDurationMs: Date.now() - startTime,
    };

    yield { type: 'done', summary: finalSummary, confluenceActive };
  } finally {
    // Step 8: Cleanup
    if (connection) {
      try { await connection.end(); } catch { /* ignore */ }
    }
    if (tunnel) {
      unregisterTunnel(tunnel.dbName);
      try {
        const tshPath = await findTsh().catch(() => '');
        if (tshPath) await stopTunnel(tshPath, tunnel as any);
        else tunnel.process.kill('SIGKILL');
      } catch { /* ignore */ }
    }
  }
}

/**
 * Discover databases on an instance by opening a temp tunnel and querying SCHEMATA.
 */
export async function discoverDatabases(cluster: string, instance: string): Promise<string[]> {
  const tsh = await findTsh();
  const status = await getLoginStatus(tsh, cluster);
  if (!status.loggedIn || !status.username) {
    throw new Error('Not logged in to Teleport. Please log in first.');
  }

  const tunnel = await startTunnel(tsh, instance, status.username, cluster);
  registerTunnel(tunnel);
  try {
    const connection = await mysql.createConnection({
      host: tunnel.host,
      port: tunnel.port,
      user: tunnel.dbUser,
      database: 'information_schema',
      connectTimeout: 10_000,
    });

    try {
      const [rows] = await connection.query<mysql.RowDataPacket[]>(
        'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA ORDER BY SCHEMA_NAME',
      );
      return rows
        .map(r => r.SCHEMA_NAME as string)
        .filter(name => !SYSTEM_SCHEMAS.has(name));
    } finally {
      await connection.end();
    }
  } finally {
    unregisterTunnel(tunnel.dbName);
    await stopTunnel(tsh, tunnel);
  }
}
