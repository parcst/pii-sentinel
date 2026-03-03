import { TableColumnOverride } from '../types.js';

/**
 * Explicit table+column overrides for PII columns whose names are too generic
 * to pattern-match globally (e.g. "code", "short_key") but are confirmed PII
 * on specific tables per the Confluence PII reference.
 *
 * These are checked by the detector AFTER pattern matching — if a column was
 * already matched by a pattern, the override still adds its match.
 */
export const TABLE_COLUMN_OVERRIDES: TableColumnOverride[] = [
  // location_keys / locations — short_key is an integer key that can identify a location
  { table: 'location_keys', column: 'short_key', tier: 'low', category: 'authentication', label: 'Short Key (override)' },
  { table: 'locations', column: 'short_key', tier: 'low', category: 'authentication', label: 'Short Key (override)' },

  // receipts — code can contain PII-adjacent data
  { table: 'receipts', column: 'code', tier: 'low', category: 'identity', label: 'Receipt Code (override)' },

  // scratch_plays — entry_code tied to user activity
  { table: 'scratch_plays', column: 'entry_code', tier: 'low', category: 'identity', label: 'Entry Code (override)' },
];

/**
 * Build a lookup map keyed by "tablename.columnname" for O(1) lookups.
 */
const overrideMap = new Map<string, TableColumnOverride[]>();
for (const o of TABLE_COLUMN_OVERRIDES) {
  const key = `${o.table}.${o.column}`;
  const list = overrideMap.get(key) || [];
  list.push(o);
  overrideMap.set(key, list);
}

export function getOverrides(tableName: string, columnName: string): TableColumnOverride[] {
  return overrideMap.get(`${tableName}.${columnName}`) || [];
}

/**
 * Build an override lookup map from an array of overrides.
 */
function buildOverrideMap(overrides: TableColumnOverride[]): Map<string, TableColumnOverride[]> {
  const map = new Map<string, TableColumnOverride[]>();
  for (const o of overrides) {
    const key = `${o.table}.${o.column}`;
    const list = map.get(key) || [];
    list.push(o);
    map.set(key, list);
  }
  return map;
}

/**
 * Merge static overrides with Confluence overrides into a single lookup map.
 * Both sources are kept (no dedup) since they serve different tracking purposes.
 */
export function mergeOverrides(
  staticOverrides: TableColumnOverride[],
  confluenceOverrides: TableColumnOverride[],
): Map<string, TableColumnOverride[]> {
  return buildOverrideMap([...staticOverrides, ...confluenceOverrides]);
}

/**
 * Look up overrides from a pre-built merged map.
 */
export function getOverridesFromMap(
  map: Map<string, TableColumnOverride[]>,
  tableName: string,
  columnName: string,
): TableColumnOverride[] {
  return map.get(`${tableName}.${columnName}`) || [];
}
