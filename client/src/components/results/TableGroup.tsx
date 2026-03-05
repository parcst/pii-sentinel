import type { TableResult, ExclusionEntry, ScanMode } from '../../api/types';
import ColumnRow from './ColumnRow';

interface Props {
  table: TableResult;
  displayPath: string;
  dbLabel: string;
  scanMode: ScanMode;
  connectionInfo?: { cluster: string; instance: string; database: string };
  expanded: boolean;
  onToggle: () => void;
  exclusions: ExclusionEntry[];
  onExclude: (table: string, column: string, scope: string) => void;
  onInclude: (entry: ExclusionEntry) => void;
}

export default function TableGroup({ table, displayPath, dbLabel, scanMode, connectionInfo, expanded, onToggle, exclusions, onExclude, onInclude }: Props) {
  function getExclusionFor(columnName: string): ExclusionEntry | undefined {
    return exclusions.find(
      (e) =>
        e.table === table.tableName &&
        e.column === columnName &&
        (e.scope === 'global' || e.scope === displayPath)
    );
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-1.5 hover:bg-gray-800/50 transition-colors text-left"
      >
        <div className="w-5" />
        <span className="text-gray-500 text-xs w-5 text-center select-none">
          {expanded ? '\u25BC' : '\u25B6'}
        </span>
        <span className="text-sm text-gray-300 font-mono">{table.tableName}</span>
        <span className="text-xs text-gray-600">
          {table.piiColumns.length} PII / {table.totalColumns} cols
        </span>
      </button>
      {expanded && (
        <div>
          <div className="flex items-center gap-3 px-4 py-1 border-b border-gray-800/50">
            <div className="w-5" />
            <div className="w-5" />
            <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wider w-[52px]">Tier</span>
            <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wider min-w-[180px]">Column</span>
            <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wider min-w-[120px]">Data Type</span>
            <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wider min-w-[90px]">Category</span>
            <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wider w-[70px] text-center">Confluence</span>
            <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wider">Match</span>
            <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wider ml-auto">Actions</span>
          </div>
          {table.piiColumns.map((col) => {
            const exclusion = getExclusionFor(col.columnName);
            return (
              <ColumnRow
                key={col.columnName}
                column={col}
                tableName={table.tableName}
                displayPath={displayPath}
                dbLabel={dbLabel}
                scanMode={scanMode}
                connectionInfo={connectionInfo}
                primaryKey={table.primaryKey}
                isExcluded={!!exclusion}
                excludedBy={exclusion?.excludedBy ?? null}
                onExclude={onExclude}
                onInclude={() => exclusion && onInclude(exclusion)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
