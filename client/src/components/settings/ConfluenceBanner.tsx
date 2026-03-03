import { useScanStore } from '../../store/scan-store';

export default function ConfluenceBanner() {
  const confluenceStatus = useScanStore((s) => s.confluenceStatus);
  const confluenceValid = useScanStore((s) => s.confluenceValid);
  const confluenceValidationError = useScanStore((s) => s.confluenceValidationError);
  const setConfluenceSetupOpen = useScanStore((s) => s.setConfluenceSetupOpen);

  if (!confluenceStatus) return null;

  // Configured + validated successfully
  if (confluenceStatus.configured && confluenceValid === true) {
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

  // Configured but validation failed
  if (confluenceStatus.configured && confluenceValid === false) {
    return (
      <div className="rounded-lg bg-red-950/30 border border-red-800/40 p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
          <span className="text-xs font-medium text-red-200">Confluence connection failed</span>
        </div>
        <p className="text-xs text-red-300/70 leading-relaxed">
          {confluenceValidationError || 'Could not connect to the configured page.'}
        </p>
        <button
          onClick={() => setConfluenceSetupOpen(true)}
          className="px-3 py-1 text-xs font-medium bg-red-600/80 hover:bg-red-600 text-white rounded transition-colors"
        >
          Fix Connection
        </button>
      </div>
    );
  }

  // Configured but still validating (null)
  if (confluenceStatus.configured && confluenceValid === null) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-gray-800/60 border border-gray-700/50 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-gray-500 animate-pulse shrink-0" />
        <span className="text-xs text-gray-400">Checking Confluence connection...</span>
      </div>
    );
  }

  // Not configured — setup prompt
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
