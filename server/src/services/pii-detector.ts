import { ParsedColumn, ParsedTable, PiiMatch, PiiColumn, TableResult, TableColumnOverride, ConfidenceTier } from '../types.js';
import { PII_PATTERNS } from './pii-patterns.js';
import { getOverrides, getOverridesFromMap } from './pii-overrides.js';

const TIER_ORDER: Record<ConfidenceTier, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function highestTier(matches: PiiMatch[]): ConfidenceTier {
  let best: ConfidenceTier = 'low';
  for (const m of matches) {
    if (TIER_ORDER[m.tier] < TIER_ORDER[best]) {
      best = m.tier;
    }
  }
  return best;
}

/**
 * Test a regex against a column name, accounting for underscore word boundaries.
 *
 * The problem: `\b` treats `_` as a word character, so `\bemail` won't match
 * inside `support_email` (no word boundary between `_` and `e`).
 *
 * Fix: also test against every underscore-delimited suffix of the name.
 * e.g. `it_support_email` tests: "it_support_email", "support_email", "email"
 * This way `\bemail` matches the "email" suffix, and compound patterns like
 * `\bdevice_?id` match the "device_id" suffix of "app_device_id".
 */
function testColumnName(regex: RegExp, name: string): boolean {
  if (regex.test(name)) return true;

  const parts = name.split('_');
  for (let i = 1; i < parts.length; i++) {
    if (regex.test(parts.slice(i).join('_'))) return true;
  }

  return false;
}

export function matchColumn(col: ParsedColumn): PiiMatch[] {
  const matches: PiiMatch[] = [];
  const seen = new Set<string>();

  for (const pattern of PII_PATTERNS) {
    if (!testColumnName(pattern.regex, col.name)) continue;

    // Check data type constraints
    if (pattern.dataTypeRequire && !pattern.dataTypeRequire.test(col.dataType)) continue;
    if (pattern.dataTypeExclude && pattern.dataTypeExclude.test(col.dataType)) continue;

    // Deduplicate by label — suffix matching can cause the same pattern to match
    // multiple suffixes, but we only want one match per pattern
    const key = `${pattern.label}|${pattern.tier}|${pattern.category}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const matchedOn = pattern.dataTypeBoost && pattern.dataTypeBoost.test(col.dataType)
      ? 'name+type' as const
      : 'name' as const;

    matches.push({
      pattern: pattern.regex.source,
      tier: pattern.tier,
      category: pattern.category,
      label: pattern.label,
      matchedOn,
    });
  }

  return matches;
}

export function analyzeTable(
  parsed: ParsedTable,
  filePath: string,
  overrideMap?: Map<string, TableColumnOverride[]>,
): TableResult | null {
  const piiColumns: PiiColumn[] = [];

  for (const col of parsed.columns) {
    const matches = matchColumn(col);

    // Check table+column overrides for generic names (e.g. receipts.code)
    // If a merged override map is provided (includes Confluence), use it; otherwise fall back to static
    const overrides = overrideMap
      ? getOverridesFromMap(overrideMap, parsed.tableName, col.name)
      : getOverrides(parsed.tableName, col.name);
    for (const o of overrides) {
      const isConfluence = o.label.startsWith('Confluence:');
      matches.push({
        pattern: `${o.table}.${o.column}`,
        tier: o.tier,
        category: o.category,
        label: o.label,
        matchedOn: isConfluence ? 'confluence' : 'override',
      });
    }

    if (matches.length === 0) continue;

    const tier = highestTier(matches);
    const primaryCategory = matches[0].category;

    piiColumns.push({
      columnName: col.name,
      dataType: col.dataType,
      fullDefinition: col.fullDefinition,
      matches,
      highestTier: tier,
      primaryCategory,
    });
  }

  if (piiColumns.length === 0) return null;

  return {
    tableName: parsed.tableName,
    filePath,
    totalColumns: parsed.columns.length,
    piiColumns,
  };
}
