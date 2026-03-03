import { useEffect } from 'react';
import { getConfluenceStatus } from '../api/client';
import { useScanStore } from '../store/scan-store';

export function useConfluenceStatus() {
  const setConfluenceStatus = useScanStore((s) => s.setConfluenceStatus);

  const refresh = async () => {
    try {
      const status = await getConfluenceStatus();
      setConfluenceStatus(status);
    } catch {
      setConfluenceStatus(null);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { refresh };
}
