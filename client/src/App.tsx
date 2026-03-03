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
import { useScan } from './hooks/useScan';
import { useScanStore } from './store/scan-store';

export default function App() {
  const { scanPath, setScanPath, runScan, loading } = useScan();
  const { results, error, scanMode } = useScanStore();

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col overflow-y-auto">
          <div className="p-4 space-y-4">
            <ScanModeToggle />

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
          {results && <SummaryBar summary={results.summary} />}
          <ResultsTree />
        </main>
      </div>
    </div>
  );
}
