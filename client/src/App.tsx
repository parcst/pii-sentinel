import { useMemo } from 'react';
import Header from './components/layout/Header';
import FolderInput from './components/scan/FolderInput';
import ScanButton from './components/scan/ScanButton';
import ScanProgress from './components/scan/ScanProgress';
import ScanModeToggle from './components/scan/ScanModeToggle';
import TeleportControls from './components/scan/TeleportControls';
import LiveScanProgress from './components/scan/LiveScanProgress';
import FilterBar from './components/results/FilterBar';
import ExportButton from './components/results/ExportButton';
import SummaryBar from './components/results/SummaryBar';
import ResultsTree from './components/results/ResultsTree';
import ConfluenceBanner from './components/settings/ConfluenceBanner';
import ConfluenceSetupModal from './components/settings/ConfluenceSetupModal';
import ExclusionToast from './components/ui/ExclusionToast';
import { useScan } from './hooks/useScan';
import { useConfluenceStatus } from './hooks/useConfluenceStatus';
import { useExclusionsLoader } from './hooks/useExclusions';
import { useScanStore } from './store/scan-store';

export default function App() {
  const { scanPath, setScanPath, runScan, loading } = useScan();
  const { refresh: refreshConfluence } = useConfluenceStatus();
  useExclusionsLoader();
  const { results, error, scanMode, exclusions } = useScanStore();

  const excludedCount = useMemo(() => {
    if (!results || exclusions.length === 0) return 0;
    let count = 0;
    for (const db of results.databases) {
      for (const table of db.tables) {
        for (const col of table.piiColumns) {
          // Confluence columns are never excluded
          if (col.matches.some(m => m.matchedOn === 'confluence')) continue;
          const isExcluded = exclusions.some(
            (e) =>
              e.table === table.tableName &&
              e.column === col.columnName &&
              (e.scope === 'global' || e.scope === db.displayPath)
          );
          if (isExcluded) count++;
        }
      }
    }
    return count;
  }, [results, exclusions]);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col overflow-y-auto">
          <div className="p-4 space-y-4">
            <ScanModeToggle />
            <ConfluenceBanner />

            {scanMode === 'directory' ? (
              <>
                <FolderInput value={scanPath} onChange={setScanPath} />
                <ScanButton onClick={runScan} loading={loading} disabled={!scanPath} />
                <ScanProgress loading={loading} error={error} />
              </>
            ) : (
              <>
                <TeleportControls />
                <LiveScanProgress />
              </>
            )}

            <FilterBar />
            <ExportButton />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {results && <SummaryBar summary={results.summary} excludedCount={excludedCount} />}
          <ResultsTree />
        </main>
      </div>

      <ConfluenceSetupModal onSaved={refreshConfluence} />
      <ExclusionToast />
    </div>
  );
}
