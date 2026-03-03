import { useCallback } from 'react';
import { scan } from '../api/client';
import { useScanStore } from '../store/scan-store';

export function useScan() {
  const { scanPath, setScanPath, setResults, setLoading, setError, loading } = useScanStore();

  const doScan = useCallback(async () => {
    const path = useScanStore.getState().scanPath;
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const results = await scan(path);
      setResults(results);
    } catch (err: any) {
      setError(err.message || 'Scan failed');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setResults]);

  const runScan = useCallback(() => {
    if (!scanPath || loading) return;
    const { confluenceValid, setConfluenceSetupOpen, setPendingScanAction } = useScanStore.getState();

    // Already validated on mount — scan directly
    if (confluenceValid === true) {
      doScan();
      return;
    }

    // Not configured or broken — show modal with pending scan
    setPendingScanAction(doScan);
    setConfluenceSetupOpen(true);
  }, [scanPath, loading, doScan]);

  return { scanPath, setScanPath, runScan, loading };
}
