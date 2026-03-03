import { useEffect, useCallback } from 'react';
import { useScanStore } from '../store/scan-store';
import { getExclusions, addExclusion, removeExclusion, clearAllExclusions } from '../api/client';
import type { ExclusionEntry } from '../api/types';

/** Load exclusions on mount — call once in App.tsx */
export function useExclusionsLoader() {
  const setExclusions = useScanStore((s) => s.setExclusions);
  const setOsUsername = useScanStore((s) => s.setOsUsername);

  useEffect(() => {
    getExclusions()
      .then(({ exclusions, username }) => {
        setExclusions(exclusions);
        setOsUsername(username);
      })
      .catch(() => {
        // fail-soft: leave defaults
      });
  }, [setExclusions, setOsUsername]);
}

/** Action hooks for exclude/include/clearAll with optimistic updates */
export function useExclusions() {
  const addLocal = useScanStore((s) => s.addExclusionLocal);
  const removeLocal = useScanStore((s) => s.removeExclusionLocal);
  const clearLocal = useScanStore((s) => s.clearAllExclusionsLocal);
  const osUsername = useScanStore((s) => s.osUsername);

  const exclude = useCallback(
    async (table: string, column: string, scope: string) => {
      const entry: ExclusionEntry = {
        table,
        column,
        scope,
        excludedBy: osUsername,
        excludedAt: new Date().toISOString(),
      };
      addLocal(entry);
      try {
        await addExclusion({ table, column, scope });
      } catch {
        // rollback on error
        removeLocal(entry);
      }
      return entry;
    },
    [addLocal, removeLocal, osUsername]
  );

  const include = useCallback(
    async (entry: ExclusionEntry) => {
      removeLocal(entry);
      try {
        await removeExclusion({ table: entry.table, column: entry.column, scope: entry.scope });
      } catch {
        // rollback on error
        addLocal(entry);
      }
    },
    [addLocal, removeLocal]
  );

  const clearAll = useCallback(async () => {
    const prev = useScanStore.getState().exclusions;
    clearLocal();
    try {
      await clearAllExclusions();
    } catch {
      // rollback
      useScanStore.getState().setExclusions(prev);
    }
  }, [clearLocal]);

  return { exclude, include, clearAll };
}
