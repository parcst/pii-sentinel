import { useState } from 'react';
import type { PiiColumn } from '../../api/types';
import ConfidenceBadge from './ConfidenceBadge';
import ExcludeScopePopover from './ExcludeScopePopover';

interface Props {
  column: PiiColumn;
  tableName: string;
  displayPath: string;
  dbLabel: string;
  isExcluded: boolean;
  excludedBy: string | null;
  onExclude: (table: string, column: string, scope: string) => void;
  onInclude: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  identity: 'text-purple-400',
  contact: 'text-cyan-400',
  personal: 'text-pink-400',
  financial: 'text-emerald-400',
  digital: 'text-blue-400',
  medical: 'text-red-400',
  biometric: 'text-amber-400',
  authentication: 'text-gray-400',
};

export default function ColumnRow({ column, tableName, displayPath, dbLabel, isExcluded, excludedBy, onExclude, onInclude }: Props) {
  const onConfluence = column.matches.some(m => m.matchedOn === 'confluence');
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <div className={`flex items-center gap-3 px-4 py-1.5 hover:bg-gray-800/50 transition-colors ${isExcluded ? 'opacity-40' : ''}`}>
      <div className="w-5" />
      <div className="w-5" />
      <ConfidenceBadge tier={column.highestTier} small />
      <span className={`text-sm font-mono text-gray-200 min-w-[180px] ${isExcluded ? 'line-through' : ''}`}>
        {column.columnName}
      </span>
      <span className="text-xs font-mono text-gray-500 min-w-[120px]">{column.dataType}</span>
      <span className={`text-xs min-w-[90px] ${CATEGORY_COLORS[column.primaryCategory] || 'text-gray-500'}`}>
        {column.primaryCategory}
      </span>
      <span className={`text-xs font-medium w-[70px] text-center ${onConfluence ? 'text-blue-400' : 'text-gray-600'}`}>
        {onConfluence ? 'Y' : 'N'}
      </span>
      <span className="text-xs text-gray-500 truncate max-w-[200px]">
        {isExcluded && excludedBy ? (
          <span className="text-gray-600 italic">excluded by {excludedBy}</span>
        ) : (
          column.matches[0]?.label
        )}
      </span>
      {/* Actions */}
      <div className="ml-auto relative">
        {!onConfluence && !isExcluded && (
          <button
            onClick={(e) => { e.stopPropagation(); setPopoverOpen(true); }}
            className="px-2 py-0.5 text-[11px] text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 rounded transition-colors"
          >
            Exclude
          </button>
        )}
        {!onConfluence && isExcluded && (
          <button
            onClick={(e) => { e.stopPropagation(); onInclude(); }}
            className="px-2 py-0.5 text-[11px] text-blue-400 hover:text-blue-300 border border-blue-800 hover:border-blue-600 rounded transition-colors"
          >
            Include
          </button>
        )}
        {popoverOpen && (
          <ExcludeScopePopover
            displayPath={displayPath}
            dbLabel={dbLabel}
            onConfirm={(scope) => {
              setPopoverOpen(false);
              onExclude(tableName, column.columnName, scope);
            }}
            onCancel={() => setPopoverOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
