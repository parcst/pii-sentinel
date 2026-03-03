import type { DatabaseResult, ExclusionEntry } from '../../api/types';
import TableGroup from './TableGroup';

interface Props {
  database: DatabaseResult;
  expanded: boolean;
  onToggle: () => void;
  expandedTables: Set<string>;
  onToggleTable: (tableKey: string) => void;
  exclusions: ExclusionEntry[];
  onExclude: (table: string, column: string, scope: string) => void;
  onInclude: (entry: ExclusionEntry) => void;
}

export default function DatabaseGroup({ database, expanded, onToggle, expandedTables, onToggleTable, exclusions, onExclude, onInclude }: Props) {
  const { location } = database;
  // Build a clean label from location fields, skipping "unknown" values
  const allParts = [location.cluster, location.connection, location.region, location.instance, location.database];
  const knownParts = allParts.filter(p => p && p !== 'unknown');
  // For the header, prefer "instance / database" if both are known, otherwise show all known parts
  const instanceKnown = location.instance && location.instance !== 'unknown';
  const databaseKnown = location.database && location.database !== 'unknown';
  const dbLabel = instanceKnown && databaseKnown
    ? `${location.instance} / ${location.database}`
    : knownParts.length > 0
      ? knownParts.join(' / ')
      : '(root)';
  const cleanDisplayPath = knownParts.length > 0 ? knownParts.join('/') : '';

  return (
    <div className="border-b border-gray-800/50">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-800/30 transition-colors text-left"
      >
        <span className="text-gray-500 text-xs w-5 text-center select-none">
          {expanded ? '\u25BC' : '\u25B6'}
        </span>
        <span className="text-sm font-medium text-gray-200">{dbLabel}</span>
        <span className="text-xs text-gray-600">
          {database.tables.length} tables, {database.totalPiiColumns} PII columns
        </span>
        <span className="ml-auto text-[10px] text-gray-600 font-mono truncate max-w-[300px]">
          {cleanDisplayPath}
        </span>
      </button>
      {expanded && (
        <div className="pb-1">
          {database.tables.map((table) => {
            const tableKey = `${database.displayPath}/${table.tableName}`;
            return (
              <TableGroup
                key={table.tableName}
                table={table}
                displayPath={database.displayPath}
                dbLabel={dbLabel}
                expanded={expandedTables.has(tableKey)}
                onToggle={() => onToggleTable(tableKey)}
                exclusions={exclusions}
                onExclude={onExclude}
                onInclude={onInclude}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
