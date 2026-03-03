import { Router, Request, Response } from 'express';
import path from 'path';
import { discoverTableFiles, extractLocation } from '../services/scanner.js';
import { parseTableFile } from '../services/parser.js';
import { analyzeTable } from '../services/pii-detector.js';
import { TABLE_COLUMN_OVERRIDES, mergeOverrides } from '../services/pii-overrides.js';
import { loadConfluenceOverrides } from '../services/confluence-overrides.js';
import {
  ConfidenceTier,
  ConfluenceConfig,
  PiiCategory,
  DatabaseResult,
  ScanResponse,
  ScanSummary,
  TableResult,
  TableColumnOverride,
} from '../types.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { path: rootDir } = req.body;

  if (!rootDir || typeof rootDir !== 'string') {
    res.status(400).json({ error: 'path is required' });
    return;
  }

  try {
    const startTime = Date.now();

    // 0. Check for Confluence credentials and load overrides
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

    // 1. Discover all table SQL files
    const tableFiles = await discoverTableFiles(rootDir);

    // 2. Parse and analyze each file
    const dbMap = new Map<string, { location: any; tables: TableResult[] }>();

    for (const filePath of tableFiles) {
      const parsed = await parseTableFile(filePath);
      const result = analyzeTable(parsed, filePath, overrideMap);
      if (!result) continue;

      const location = extractLocation(filePath, rootDir);
      const dbKey = `${location.cluster}/${location.connection}/${location.region}/${location.instance}/${location.database}`;

      if (!dbMap.has(dbKey)) {
        dbMap.set(dbKey, { location, tables: [] });
      }
      dbMap.get(dbKey)!.tables.push(result);
    }

    // 3. Build database results
    const databases: DatabaseResult[] = [];
    for (const [dbKey, entry] of dbMap) {
      entry.tables.sort((a, b) => a.tableName.localeCompare(b.tableName));
      const totalPiiColumns = entry.tables.reduce((sum, t) => sum + t.piiColumns.length, 0);
      databases.push({
        location: entry.location,
        displayPath: dbKey,
        tables: entry.tables,
        totalPiiColumns,
      });
    }
    databases.sort((a, b) => a.displayPath.localeCompare(b.displayPath));

    // 4. Build summary
    const byTier: Record<ConfidenceTier, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    const byCategory: Record<PiiCategory, number> = {
      identity: 0, contact: 0, personal: 0, financial: 0,
      digital: 0, medical: 0, biometric: 0, authentication: 0,
    };

    let totalPiiColumns = 0;
    let totalTablesWithPii = 0;
    for (const db of databases) {
      for (const table of db.tables) {
        totalTablesWithPii++;
        for (const col of table.piiColumns) {
          totalPiiColumns++;
          byTier[col.highestTier]++;
          byCategory[col.primaryCategory]++;
        }
      }
    }

    const summary: ScanSummary = {
      totalFilesScanned: tableFiles.length,
      totalTablesWithPii,
      totalPiiColumns,
      byTier,
      byCategory,
      scanDurationMs: Date.now() - startTime,
    };

    const response: ScanResponse = { databases, summary, ...(confluenceActive && { confluenceActive }) };
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Scan failed' });
  }
});

export default router;
