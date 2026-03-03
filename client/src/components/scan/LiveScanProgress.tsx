import { useState } from 'react';
import { useScanStore } from '../../store/scan-store';

export default function LiveScanProgress() {
  const { liveScanning, streamingProgress, scanErrors } = useScanStore();
  const [errorsExpanded, setErrorsExpanded] = useState(false);

  if (!liveScanning && scanErrors.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Progress spinner */}
      {liveScanning && streamingProgress && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <svg className="animate-spin h-3 w-3 text-red-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="truncate">{streamingProgress}</span>
        </div>
      )}

      {/* Errors panel */}
      {scanErrors.length > 0 && (
        <details
          open={errorsExpanded}
          onToggle={(e) => setErrorsExpanded((e.target as HTMLDetailsElement).open)}
        >
          <summary className="text-xs text-red-400 cursor-pointer hover:text-red-300 select-none">
            {scanErrors.length} error{scanErrors.length !== 1 ? 's' : ''} during scan
          </summary>
          <div className="mt-1 max-h-32 overflow-y-auto space-y-1 bg-red-950/30 border border-red-900/50 rounded p-2">
            {scanErrors.map((err, i) => (
              <div key={i} className="text-xs text-red-300">
                {err.database && (
                  <span className="text-red-400 font-medium">[{err.database}] </span>
                )}
                {err.message}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
