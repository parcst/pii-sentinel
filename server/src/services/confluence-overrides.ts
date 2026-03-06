import * as cheerio from 'cheerio';
import { ConfluenceConfig, TableColumnOverride, PiiCategory } from '../types.js';

/**
 * Fetch the Confluence page HTML via REST API v1.
 * Uses Basic auth with email:apiToken.
 */
export async function fetchConfluencePage(config: ConfluenceConfig): Promise<string> {
  const url = `${config.baseUrl}/wiki/rest/api/content/${config.pageId}?expand=body.storage`;
  const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');

  const res = await fetch(url, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Confluence API returned ${res.status}: ${res.statusText}`);
  }

  const data = await res.json() as { body: { storage: { value: string } } };
  return data.body.storage.value;
}

/**
 * Infer a PII category from a column name using simple heuristics.
 */
function inferCategory(columnName: string): PiiCategory {
  const name = columnName.toLowerCase();
  if (/email|phone|address|city|state|zip|postal/.test(name)) return 'contact';
  if (/ssn|sin|passport|license|birth|gender|dob/.test(name)) return 'personal';
  if (/card|bank|account_?num|routing|iban|swift/.test(name)) return 'financial';
  if (/ip|mac_?addr|device|user_?agent|cookie|session/.test(name)) return 'digital';
  if (/diagnosis|medical|health|prescription/.test(name)) return 'medical';
  if (/finger|retina|face_?id|biometric/.test(name)) return 'biometric';
  if (/password|secret|token|api_?key|auth/.test(name)) return 'authentication';
  return 'identity';
}

/**
 * Parse the Confluence page HTML to extract the PII reference table.
 * Expected columns: Table, Column, IsPII (Y/N), Sensitive Data (Y/N), ...
 * Returns overrides for rows where IsPII=Y or Sensitive Data=Y.
 */
export function parseConfluenceTable(html: string): TableColumnOverride[] {
  const $ = cheerio.load(html);
  const overrides: TableColumnOverride[] = [];

  $('table').each((_, table) => {
    const rows = $(table).find('tr');
    if (rows.length < 2) return;

    // Parse header row to find column indices
    const headers: string[] = [];
    $(rows[0]).find('th, td').each((_, cell) => {
      headers.push($(cell).text().trim().toLowerCase());
    });

    // Support both exact match ("table"/"column") and tracker-style ("table name"/"column name")
    const tableIdx = headers.findIndex(h => h === 'table' || h === 'table name');
    const columnIdx = headers.findIndex(h => h === 'column' || h === 'column name');
    const isPiiIdx = headers.findIndex(h => h === 'ispii' || h === 'is pii' || h === 'is_pii');
    const sensitiveIdx = headers.findIndex(h =>
      h.includes('sensitive') && h.includes('data')
    );

    // If table has Table + Column headers but no IsPII/Sensitive columns,
    // treat every row as implicit PII (e.g. tracker page where all entries are PII)
    const implicitPii = tableIdx !== -1 && columnIdx !== -1 && isPiiIdx === -1 && sensitiveIdx === -1;

    // Skip tables that don't have the expected structure
    if (tableIdx === -1 || columnIdx === -1 || (!implicitPii && isPiiIdx === -1 && sensitiveIdx === -1)) return;

    // Parse data rows
    rows.slice(1).each((_, row) => {
      const cells: string[] = [];
      $(row).find('td').each((_, cell) => {
        cells.push($(cell).text().trim());
      });

      const tableName = cells[tableIdx]?.toLowerCase();
      const columnName = cells[columnIdx]?.toLowerCase();
      if (!tableName || !columnName) return;

      if (implicitPii) {
        // Every row on the tracker is PII
        overrides.push({
          table: tableName,
          column: columnName,
          tier: 'high',
          category: inferCategory(columnName),
          label: `Confluence: ${tableName}.${columnName}`,
        });
        return;
      }

      const isYes = (val: string | undefined) => !!val && /^y(es)?$/i.test(val.trim());
      const isPii = isPiiIdx !== -1 && isYes(cells[isPiiIdx]);
      const isSensitive = sensitiveIdx !== -1 && isYes(cells[sensitiveIdx]);

      if (!isPii && !isSensitive) return;

      overrides.push({
        table: tableName,
        column: columnName,
        tier: isPii ? 'high' : 'medium',
        category: inferCategory(columnName),
        label: `Confluence: ${tableName}.${columnName}`,
      });
    });
  });

  return overrides;
}

/**
 * Top-level: fetch the Confluence page and parse overrides.
 * Returns empty array on any failure so the scan continues with static overrides.
 */
export async function loadConfluenceOverrides(config: ConfluenceConfig): Promise<TableColumnOverride[]> {
  try {
    const html = await fetchConfluencePage(config);
    const overrides = parseConfluenceTable(html);
    console.log(`Fetched ${overrides.length} overrides from Confluence`);
    return overrides;
  } catch (err: any) {
    console.warn(`Confluence override fetch failed: ${err.message}. Using static overrides only.`);
    return [];
  }
}
