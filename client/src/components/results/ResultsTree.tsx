import { useMemo } from 'react';
import { useScanStore } from '../../store/scan-store';
import type { DatabaseResult, PiiColumn } from '../../api/types';
import DatabaseGroup from './DatabaseGroup';

function matchesFilters(
  col: PiiColumn,
  tierFilter: Set<string>,
  categoryFilter: Set<string>,
  searchQuery: string,
  excludeConfluence: boolean,
): boolean {
  // When excluding Confluence, hide any column that appears on the Confluence page
  if (excludeConfluence) {
    const hasConfluence = col.matches.some(m => m.matchedOn === 'confluence');
    if (hasConfluence) return false;
  }
  if (tierFilter.size > 0 && !tierFilter.has(col.highestTier)) return false;
  if (categoryFilter.size > 0 && !categoryFilter.has(col.primaryCategory)) return false;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    const matchesName = col.columnName.toLowerCase().includes(q);
    const matchesLabel = col.matches.some((m) => m.label.toLowerCase().includes(q));
    const matchesCategory = col.primaryCategory.toLowerCase().includes(q);
    if (!matchesName && !matchesLabel && !matchesCategory) return false;
  }
  return true;
}

export default function ResultsTree() {
  const {
    results,
    tierFilter,
    categoryFilter,
    searchQuery,
    excludeConfluence,
    expandedDatabases,
    expandedTables,
    toggleExpandDatabase,
    toggleTable,
  } = useScanStore();

  const filtered = useMemo(() => {
    if (!results) return [];

    return results.databases
      .map((db): DatabaseResult | null => {
        const filteredTables = db.tables
          .map((table) => {
            const filteredCols = table.piiColumns.filter((col) =>
              matchesFilters(col, tierFilter, categoryFilter, searchQuery, excludeConfluence)
            );
            if (filteredCols.length === 0) return null;
            return { ...table, piiColumns: filteredCols };
          })
          .filter((t): t is NonNullable<typeof t> => t !== null);

        if (filteredTables.length === 0) return null;

        const totalPiiColumns = filteredTables.reduce((sum, t) => sum + t.piiColumns.length, 0);
        return { ...db, tables: filteredTables, totalPiiColumns };
      })
      .filter((db): db is DatabaseResult => db !== null);
  }, [results, tierFilter, categoryFilter, searchQuery, excludeConfluence]);

  if (!results) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
        Select a directory and scan to see results
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
        No PII columns match the current filters
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {filtered.map((db) => (
        <DatabaseGroup
          key={db.displayPath}
          database={db}
          expanded={expandedDatabases.has(db.displayPath)}
          onToggle={() => toggleExpandDatabase(db.displayPath)}
          expandedTables={expandedTables}
          onToggleTable={toggleTable}
        />
      ))}
    </div>
  );
}
