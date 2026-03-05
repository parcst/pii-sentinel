import { useEffect } from 'react';
import { getJiraStatus, validateJiraConnection, getJiraTickets } from '../api/client';
import { useScanStore } from '../store/scan-store';

export function useJiraStatus() {
  const setJiraStatus = useScanStore((s) => s.setJiraStatus);
  const setJiraValid = useScanStore((s) => s.setJiraValid);
  const setJiraValidationError = useScanStore((s) => s.setJiraValidationError);
  const setJiraTickets = useScanStore((s) => s.setJiraTickets);

  const refresh = async () => {
    try {
      const status = await getJiraStatus();
      setJiraStatus(status);

      if (status.configured) {
        try {
          const result = await validateJiraConnection();
          setJiraValid(result.success);
          if (!result.success) {
            setJiraValidationError(result.error ?? 'Connection failed');
          } else {
            setJiraValidationError(null);
          }
        } catch {
          setJiraValid(false);
          setJiraValidationError('Could not reach server to validate');
        }
      } else {
        setJiraValid(null);
        setJiraValidationError(null);
      }

      // Load existing tickets
      try {
        const { tickets } = await getJiraTickets();
        setJiraTickets(tickets);
      } catch {
        // ignore — tickets will just be empty
      }
    } catch {
      setJiraStatus(null);
      setJiraValid(null);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { refresh };
}
