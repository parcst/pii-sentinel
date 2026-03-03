import { useScanStore } from '../../store/scan-store';

export default function ConfluenceBanner() {
  const confluenceStatus = useScanStore((s) => s.confluenceStatus);
  const setConfluenceSetupOpen = useScanStore((s) => s.setConfluenceSetupOpen);

  if (!confluenceStatus) return null;

  // Configured state — compact indicator
  if (confluenceStatus.configured) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-gray-800/60 border border-gray-700/50 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-xs text-gray-300 truncate">
            Confluence linked{confluenceStatus.source === 'env' ? ' (via .env)' : ''}
          </span>
        </div>
        <button
          onClick={() => setConfluenceSetupOpen(true)}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors shrink-0 ml-2"
        >
          Edit
        </button>
      </div>
    );
  }

  // Not configured — callout card (no dismiss, scan button will gate)
  return (
    <div className="rounded-lg bg-blue-950/40 border border-blue-800/40 p-3 space-y-2">
      <p className="text-xs text-blue-200/90 leading-relaxed">
        Link a Confluence PII page to highlight already-identified PII columns in scan results.
      </p>
      <button
        onClick={() => setConfluenceSetupOpen(true)}
        className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
      >
        Set Up
      </button>
    </div>
  );
}
