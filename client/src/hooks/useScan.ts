import { useCallback } from 'react';
import { scan } from '../api/client';
import { useScanStore } from '../store/scan-store';

export function useScan() {
  const { scanPath, setScanPath, setResults, setLoading, setError, loading } = useScanStore();

  const runScan = useCallback(async () => {
    if (!scanPath || loading) return;
    setLoading(true);
    setError(null);
    try {
      const results = await scan(scanPath);
      setResults(results);
    } catch (err: any) {
      setError(err.message || 'Scan failed');
    } finally {
      setLoading(false);
    }
  }, [scanPath, loading, setLoading, setError, setResults]);

  return { scanPath, setScanPath, runScan, loading };
}
