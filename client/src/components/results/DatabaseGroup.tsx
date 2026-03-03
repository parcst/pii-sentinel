import type { DatabaseResult } from '../../api/types';
import TableGroup from './TableGroup';

interface Props {
  database: DatabaseResult;
  expanded: boolean;
  onToggle: () => void;
  expandedTables: Set<string>;
  onToggleTable: (tableKey: string) => void;
}

export default function DatabaseGroup({ database, expanded, onToggle, expandedTables, onToggleTable }: Props) {
  const { location } = database;
  const dbLabel = `${location.instance} / ${location.database}`;

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
          {database.displayPath}
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
                expanded={expandedTables.has(tableKey)}
                onToggle={() => onToggleTable(tableKey)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
