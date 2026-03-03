import { useCallback } from 'react';
import { scan, validateConfluenceConnection } from '../api/client';
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

  const runScan = useCallback(async () => {
    if (!scanPath || loading) return;
    const { confluenceStatus, setConfluenceSetupOpen, setPendingScanAction, setConfluenceValidationError } = useScanStore.getState();

    // Not configured — show setup modal
    if (!confluenceStatus?.configured) {
      setPendingScanAction(doScan);
      setConfluenceSetupOpen(true);
      return;
    }

    // Configured — validate the connection first
    try {
      const result = await validateConfluenceConnection();
      if (!result.success) {
        setConfluenceValidationError(result.error ?? 'Connection failed');
        setPendingScanAction(doScan);
        setConfluenceSetupOpen(true);
        return;
      }
    } catch {
      // Validation request itself failed — let scan proceed, server handles gracefully
    }

    doScan();
  }, [scanPath, loading, doScan]);

  return { scanPath, setScanPath, runScan, loading };
}
