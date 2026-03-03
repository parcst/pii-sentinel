import { useEffect } from 'react';
import { getConfluenceStatus, validateConfluenceConnection } from '../api/client';
import { useScanStore } from '../store/scan-store';

export function useConfluenceStatus() {
  const setConfluenceStatus = useScanStore((s) => s.setConfluenceStatus);
  const setConfluenceValid = useScanStore((s) => s.setConfluenceValid);
  const setConfluenceValidationError = useScanStore((s) => s.setConfluenceValidationError);

  const refresh = async () => {
    try {
      const status = await getConfluenceStatus();
      setConfluenceStatus(status);

      if (status.configured) {
        // Validate the saved config actually works
        try {
          const result = await validateConfluenceConnection();
          setConfluenceValid(result.success);
          if (!result.success) {
            setConfluenceValidationError(result.error ?? 'Connection failed');
          } else {
            setConfluenceValidationError(null);
          }
        } catch {
          setConfluenceValid(false);
          setConfluenceValidationError('Could not reach server to validate');
        }
      } else {
        setConfluenceValid(null);
        setConfluenceValidationError(null);
      }
    } catch {
      setConfluenceStatus(null);
      setConfluenceValid(null);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { refresh };
}
