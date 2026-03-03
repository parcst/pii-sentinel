import type { PiiColumn } from '../../api/types';
import ConfidenceBadge from './ConfidenceBadge';

interface Props {
  column: PiiColumn;
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

export default function ColumnRow({ column }: Props) {
  const onConfluence = column.matches.some(m => m.matchedOn === 'confluence');

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 hover:bg-gray-800/50 transition-colors">
      <div className="w-5" />
      <div className="w-5" />
      <ConfidenceBadge tier={column.highestTier} small />
      <span className="text-sm font-mono text-gray-200 min-w-[180px]">{column.columnName}</span>
      <span className="text-xs font-mono text-gray-500 min-w-[120px]">{column.dataType}</span>
      <span className={`text-xs min-w-[90px] ${CATEGORY_COLORS[column.primaryCategory] || 'text-gray-500'}`}>
        {column.primaryCategory}
      </span>
      <span className={`text-xs font-medium w-[70px] text-center ${onConfluence ? 'text-blue-400' : 'text-gray-600'}`}>
        {onConfluence ? 'Y' : 'N'}
      </span>
      <span className="text-xs text-gray-500 ml-auto truncate max-w-[200px]">
        {column.matches[0]?.label}
      </span>
    </div>
  );
}
