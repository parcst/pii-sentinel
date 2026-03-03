import { useCallback } from 'react';
import { useScanStore } from '../../store/scan-store';
import { useTeleport } from '../../hooks/useTeleport';
import TeleportDatabasePicker from './TeleportDatabasePicker';

export default function TeleportControls() {
  const {
    clusters,
    selectedCluster,
    loginStatus,
    instances,
    selectedInstance,
    selectedDatabases,
    liveScanning,
  } = useScanStore();

  const { selectCluster, login, selectInstance, startLiveScan, cancelLiveScan } = useTeleport();

  const canScan = selectedCluster && selectedInstance && selectedDatabases.size > 0 && !liveScanning;

  const handleScan = useCallback(() => {
    const { confluenceValid, setConfluenceSetupOpen, setPendingScanAction } = useScanStore.getState();

    if (confluenceValid === true) {
      startLiveScan();
      return;
    }

    setPendingScanAction(startLiveScan);
    setConfluenceSetupOpen(true);
  }, [startLiveScan]);

  return (
    <div className="space-y-3">
      {/* Cluster dropdown */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Cluster</label>
        <select
          value={selectedCluster}
          onChange={(e) => selectCluster(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
        >
          <option value="">Select cluster...</option>
          {clusters.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Login status + button */}
      {selectedCluster && (
        <div className="flex items-center gap-2">
          {loginStatus?.loggedIn ? (
            <div className="flex items-center gap-1.5 text-xs text-gray-300">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              <span className="truncate">{loginStatus.username}</span>
            </div>
          ) : (
            <button
              onClick={login}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded transition-colors"
            >
              Login (SSO)
            </button>
          )}
        </div>
      )}

      {/* Instance dropdown */}
      {loginStatus?.loggedIn && instances.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">RDS Instance</label>
          <select
            value={selectedInstance}
            onChange={(e) => selectInstance(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
          >
            <option value="">Select instance...</option>
            {instances.map((inst) => (
              <option key={inst.name} value={inst.name}>
                {inst.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Database picker */}
      {selectedInstance && <TeleportDatabasePicker />}

      {/* Scan / Cancel button */}
      {selectedInstance && (
        <div>
          {liveScanning ? (
            <button
              onClick={cancelLiveScan}
              className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium py-2 px-4 rounded text-sm transition-colors"
            >
              Cancel Scan
            </button>
          ) : (
            <button
              onClick={handleScan}
              disabled={!canScan}
              className={`w-full font-medium py-2 px-4 rounded text-sm transition-colors ${
                canScan
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              Scan for PII ({selectedDatabases.size} database{selectedDatabases.size !== 1 ? 's' : ''})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
