import type { ScanSummary } from '../../api/types';
import ConfidenceBadge from './ConfidenceBadge';

interface Props {
  summary: ScanSummary;
}

export default function SummaryBar({ summary }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-4 px-6 py-3 bg-gray-900 border-b border-gray-800">
      <div className="text-sm text-gray-400">
        <span className="text-gray-200 font-medium">{summary.totalFilesScanned.toLocaleString()}</span> tables scanned
      </div>
      <div className="text-sm text-gray-400">
        <span className="text-gray-200 font-medium">{summary.totalTablesWithPii.toLocaleString()}</span> with PII
      </div>
      <div className="text-sm text-gray-400">
        <span className="text-gray-200 font-medium">{summary.totalPiiColumns.toLocaleString()}</span> PII columns
      </div>
      <div className="text-sm text-gray-500">
        {summary.scanDurationMs.toLocaleString()}ms
      </div>

      <div className="ml-auto flex items-center gap-2">
        {(['critical', 'high', 'medium', 'low'] as const).map((tier) => (
          summary.byTier[tier] > 0 && (
            <div key={tier} className="flex items-center gap-1">
              <ConfidenceBadge tier={tier} small />
              <span className="text-xs text-gray-400">{summary.byTier[tier]}</span>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
