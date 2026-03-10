import { useMemo, useState, useRef, useEffect } from 'react';
import type { ScanResponse, ExclusionEntry } from '../../api/types';
import { useExclusions } from '../../hooks/useExclusions';

interface SuggestionRow {
  displayPath: string;
  dbLabel: string;
  tableName: string;
  columnName: string;
  dataType: string;
}

interface Props {
  results: ScanResponse;
  exclusions: ExclusionEntry[];
  onClose: () => void;
}

function buildDbLabel(location: ScanResponse['databases'][0]['location']): string {
  const allParts = [location.cluster, location.connection, location.region, location.instance, location.database];
  const knownParts = allParts.filter(p => p && p !== 'unknown');
  const instanceKnown = location.instance && location.instance !== 'unknown';
  const databaseKnown = location.database && location.database !== 'unknown';
  return instanceKnown && databaseKnown
    ? `${location.instance} / ${location.database}`
    : knownParts.length > 0
      ? knownParts.join(' / ')
      : '(root)';
}

type MatchMode = 'label' | 'exact';

function exclusionKey(e: ExclusionEntry): string {
  return `${e.table}|${e.column}|${e.scope}`;
}

function exclusionLabel(e: ExclusionEntry): string {
  const scope = e.scope === 'global' ? 'global' : e.scope;
  return `${e.table}.${e.column} (${scope})`;
}

function buildSuggestions(
  results: ScanResponse,
  exclusions: ExclusionEntry[],
  matchMode: MatchMode,
  filterExclusion: ExclusionEntry | null,
): Map<string, SuggestionRow[]> {
  const activeExclusions = filterExclusion ? [filterExclusion] : exclusions;

  // First pass: collect targets from excluded columns
  const targetLabels = new Set<string>();
  const targetNames = new Set<string>();

  for (const db of results.databases) {
    for (const table of db.tables) {
      for (const col of table.piiColumns) {
        // Skip confluence columns
        if (col.matches.some(m => m.matchedOn === 'confluence')) continue;

        // Check if this column is excluded by the active exclusion(s)
        const isExcluded = activeExclusions.some(
          e =>
            e.table === table.tableName &&
            e.column === col.columnName &&
            (e.scope === 'global' || e.scope === db.displayPath),
        );
        if (isExcluded) {
          if (matchMode === 'exact') {
            targetNames.add(col.columnName);
          } else {
            for (const match of col.matches) {
              targetLabels.add(match.label);
            }
          }
        }
      }
    }
  }

  // Second pass: find non-excluded columns that match targets
  const grouped = new Map<string, SuggestionRow[]>();

  for (const db of results.databases) {
    const dbLabel = buildDbLabel(db.location);

    for (const table of db.tables) {
      for (const col of table.piiColumns) {
        // Skip confluence columns
        if (col.matches.some(m => m.matchedOn === 'confluence')) continue;

        // Skip already-excluded columns
        const isExcluded = exclusions.some(
          e =>
            e.table === table.tableName &&
            e.column === col.columnName &&
            (e.scope === 'global' || e.scope === db.displayPath),
        );
        if (isExcluded) continue;

        const rowData: SuggestionRow = {
          displayPath: db.displayPath,
          dbLabel,
          tableName: table.tableName,
          columnName: col.columnName,
          dataType: col.dataType,
        };
        const dedupKey = `${db.displayPath}|${table.tableName}|${col.columnName}`;

        if (matchMode === 'exact') {
          // Group by exact column name
          if (targetNames.has(col.columnName)) {
            const groupKey = col.columnName;
            const rows = grouped.get(groupKey) ?? [];
            if (!rows.some(r => `${r.displayPath}|${r.tableName}|${r.columnName}` === dedupKey)) {
              rows.push(rowData);
              grouped.set(groupKey, rows);
            }
          }
        } else {
          // Group by match label
          for (const match of col.matches) {
            if (targetLabels.has(match.label)) {
              const rows = grouped.get(match.label) ?? [];
              if (!rows.some(r => `${r.displayPath}|${r.tableName}|${r.columnName}` === dedupKey)) {
                rows.push(rowData);
                grouped.set(match.label, rows);
              }
            }
          }
        }
      }
    }
  }

  return grouped;
}

function rowKey(row: SuggestionRow): string {
  return `${row.displayPath}|${row.tableName}|${row.columnName}`;
}

function GroupCheckbox({
  label,
  rows,
  selected,
  onToggle,
  isExactMode,
}: {
  label: string;
  rows: SuggestionRow[];
  selected: Set<string>;
  onToggle: (keys: string[], checked: boolean) => void;
  isExactMode: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const keys = rows.map(rowKey);
  const checkedCount = keys.filter(k => selected.has(k)).length;
  const allChecked = checkedCount === keys.length;
  const someChecked = checkedCount > 0 && !allChecked;

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = someChecked;
    }
  }, [someChecked]);

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        ref={ref}
        type="checkbox"
        checked={allChecked}
        onChange={() => onToggle(keys, !allChecked)}
        className="accent-blue-500"
      />
      <span className={`text-sm font-medium text-gray-200 ${isExactMode ? 'font-mono' : ''}`}>
        {isExactMode ? label : <>&ldquo;{label}&rdquo;</>}
      </span>
      <span className="text-xs text-gray-500">
        &mdash; {rows.length} column{rows.length !== 1 ? 's' : ''}
      </span>
    </label>
  );
}

export default function SuggestExclusionsModal({ results, exclusions, onClose }: Props) {
  const { exclude } = useExclusions();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scope, setScope] = useState<'global' | 'database'>('global');
  const [matchMode, setMatchMode] = useState<MatchMode>('label');
  const [applying, setApplying] = useState(false);
  const [filterKey, setFilterKey] = useState<string>('all');

  // Deduplicated list of exclusions that exist in the current results
  const availableExclusions = useMemo(() => {
    const seen = new Set<string>();
    const result: ExclusionEntry[] = [];
    for (const e of exclusions) {
      const k = exclusionKey(e);
      if (!seen.has(k)) {
        seen.add(k);
        result.push(e);
      }
    }
    return result.sort((a, b) => exclusionLabel(a).localeCompare(exclusionLabel(b)));
  }, [exclusions]);

  const filterExclusion = useMemo(() => {
    if (filterKey === 'all') return null;
    return availableExclusions.find(e => exclusionKey(e) === filterKey) ?? null;
  }, [filterKey, availableExclusions]);

  const suggestions = useMemo(
    () => buildSuggestions(results, exclusions, matchMode, filterExclusion),
    [results, exclusions, matchMode, filterExclusion],
  );

  // Collect all row keys for select all / deselect all
  const allKeys = useMemo(() => {
    const keys: string[] = [];
    for (const rows of suggestions.values()) {
      for (const row of rows) {
        keys.push(rowKey(row));
      }
    }
    return keys;
  }, [suggestions]);

  // Build a lookup from key to row for the exclude action
  const rowLookup = useMemo(() => {
    const map = new Map<string, SuggestionRow>();
    for (const rows of suggestions.values()) {
      for (const row of rows) {
        map.set(rowKey(row), row);
      }
    }
    return map;
  }, [suggestions]);

  // Auto-select all on first render
  useEffect(() => {
    setSelected(new Set(allKeys));
  }, [allKeys]);

  const toggleRows = (keys: string[], checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      for (const k of keys) {
        if (checked) next.add(k);
        else next.delete(k);
      }
      return next;
    });
  };

  const handleExclude = async () => {
    setApplying(true);
    const promises: Promise<ExclusionEntry>[] = [];
    for (const key of selected) {
      const row = rowLookup.get(key);
      if (!row) continue;
      const resolvedScope = scope === 'global' ? 'global' : row.displayPath;
      promises.push(exclude(row.tableName, row.columnName, resolvedScope));
    }
    await Promise.all(promises);
    setApplying(false);
    onClose();
  };

  const isEmpty = suggestions.size === 0;
  const selectedCount = selected.size;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-[680px] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-gray-100">Suggested Exclusions</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1">
          {/* Exclusion filter dropdown */}
          <div className="flex items-center gap-3 mb-3 text-sm">
            <span className="text-gray-400">Based on:</span>
            <select
              value={filterKey}
              onChange={e => setFilterKey(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All exclusions ({availableExclusions.length})</option>
              {availableExclusions.map(e => (
                <option key={exclusionKey(e)} value={exclusionKey(e)}>
                  {exclusionLabel(e)}
                </option>
              ))}
            </select>
          </div>

          {/* Match mode toggle */}
          <div className="flex items-center gap-4 mb-3 text-sm">
            <span className="text-gray-400">Match:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="matchMode"
                checked={matchMode === 'label'}
                onChange={() => setMatchMode('label')}
                className="accent-blue-500"
              />
              <span className="text-gray-300">Similar pattern</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="matchMode"
                checked={matchMode === 'exact'}
                onChange={() => setMatchMode('exact')}
                className="accent-blue-500"
              />
              <span className="text-gray-300">Exact column name only</span>
            </label>
          </div>

          {/* Scope toggle */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            <span className="text-gray-400">Scope:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="scope"
                checked={scope === 'global'}
                onChange={() => setScope('global')}
                className="accent-blue-500"
              />
              <span className="text-gray-300">Exclude everywhere (global)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="scope"
                checked={scope === 'database'}
                onChange={() => setScope('database')}
                className="accent-blue-500"
              />
              <span className="text-gray-300">Exclude only in each column&apos;s database</span>
            </label>
          </div>

          {isEmpty ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No similar columns found.
              {matchMode === 'exact'
                ? ' Try switching to "Similar pattern" for broader matches.'
                : ' Exclude more columns to see suggestions based on shared PII pattern labels.'}
            </p>
          ) : (
            <>
              {/* Grouped suggestions */}
              <div className="space-y-4">
                {[...suggestions.entries()].map(([label, rows]) => (
                  <div key={label}>
                    <div className="mb-1.5">
                      <GroupCheckbox
                        label={label}
                        rows={rows}
                        selected={selected}
                        onToggle={toggleRows}
                        isExactMode={matchMode === 'exact'}
                      />
                    </div>
                    <div className="ml-6 border border-gray-800 rounded overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-800/50 text-gray-500">
                            <th className="w-8 px-2 py-1"></th>
                            <th className="text-left px-2 py-1 font-medium">Database</th>
                            <th className="text-left px-2 py-1 font-medium">Table</th>
                            <th className="text-left px-2 py-1 font-medium">Column</th>
                            <th className="text-left px-2 py-1 font-medium">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(row => {
                            const key = rowKey(row);
                            const checked = selected.has(key);
                            return (
                              <tr
                                key={key}
                                className="border-t border-gray-800/50 hover:bg-gray-800/20"
                              >
                                <td className="px-2 py-1 text-center">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleRows([key], !checked)}
                                    className="accent-blue-500"
                                  />
                                </td>
                                <td className="px-2 py-1 text-gray-400">{row.dbLabel}</td>
                                <td className="px-2 py-1 text-gray-300">{row.tableName}</td>
                                <td className="px-2 py-1 text-gray-200 font-mono">{row.columnName}</td>
                                <td className="px-2 py-1 text-gray-500 font-mono">{row.dataType}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800">
          <div className="flex items-center gap-2">
            {!isEmpty && (
              <>
                <button
                  onClick={() => setSelected(new Set(allKeys))}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Select All
                </button>
                <span className="text-gray-700">|</span>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Deselect All
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            {!isEmpty && (
              <button
                onClick={handleExclude}
                disabled={selectedCount === 0 || applying}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {applying
                  ? 'Excluding...'
                  : `Exclude ${selectedCount} selected`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
