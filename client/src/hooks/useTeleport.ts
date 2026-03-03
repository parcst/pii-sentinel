import { useCallback, useEffect, useRef } from 'react';
import { useScanStore } from '../store/scan-store';
import {
  teleportStatus,
  teleportClusters,
  teleportLoginStatus,
  teleportLogin,
  teleportInstances,
  teleportDatabases,
  teleportScanUrl,
  teleportCancel,
} from '../api/client';
import type { LiveScanEvent } from '../api/types';

export function useTeleport() {
  const store = useScanStore();
  const loginPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Check tsh availability on mount
  useEffect(() => {
    teleportStatus()
      .then(({ available }) => store.setTshAvailable(available))
      .catch(() => store.setTshAvailable(false));
  }, []);

  // Load clusters when mode switches to live
  useEffect(() => {
    if (store.scanMode === 'live' && store.clusters.length === 0) {
      teleportClusters()
        .then(({ clusters }) => store.setClusters(clusters))
        .catch(() => {});
    }
  }, [store.scanMode]);

  // Start login polling when a cluster is selected and user is not logged in
  const startLoginPolling = useCallback(() => {
    if (loginPollRef.current) return;
    loginPollRef.current = setInterval(async () => {
      const cluster = useScanStore.getState().selectedCluster;
      if (!cluster) return;
      try {
        const status = await teleportLoginStatus(cluster);
        useScanStore.getState().setLoginStatus(status);
        if (status.loggedIn && loginPollRef.current) {
          clearInterval(loginPollRef.current);
          loginPollRef.current = null;
        }
      } catch { /* ignore */ }
    }, 2000);
  }, []);

  const stopLoginPolling = useCallback(() => {
    if (loginPollRef.current) {
      clearInterval(loginPollRef.current);
      loginPollRef.current = null;
    }
  }, []);

  // Cleanup on unmount and page close
  useEffect(() => {
    const handleBeforeUnload = () => {
      navigator.sendBeacon('/api/teleport/shutdown');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      stopLoginPolling();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stopLoginPolling();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [stopLoginPolling]);

  // Check login status when cluster changes
  const selectCluster = useCallback(async (cluster: string) => {
    stopLoginPolling();
    store.setSelectedCluster(cluster);
    if (!cluster) return;

    try {
      const status = await teleportLoginStatus(cluster);
      store.setLoginStatus(status);

      if (status.loggedIn) {
        // Auto-load instances
        const { instances } = await teleportInstances(cluster);
        store.setInstances(instances);
      }
    } catch { /* ignore */ }
  }, [store, stopLoginPolling]);

  // Login to cluster
  const login = useCallback(async () => {
    if (!store.selectedCluster) return;
    try {
      await teleportLogin(store.selectedCluster);
      startLoginPolling();
    } catch { /* ignore */ }
  }, [store.selectedCluster, startLoginPolling]);

  // Load instances after successful login
  useEffect(() => {
    if (store.loginStatus?.loggedIn && store.selectedCluster && store.instances.length === 0) {
      teleportInstances(store.selectedCluster)
        .then(({ instances }) => store.setInstances(instances))
        .catch(() => {});
    }
  }, [store.loginStatus?.loggedIn, store.selectedCluster]);

  // Select instance and discover databases
  const selectInstance = useCallback(async (instanceName: string) => {
    store.setSelectedInstance(instanceName);
    if (!instanceName || !store.selectedCluster) return;

    store.setDiscoveringDatabases(true);
    try {
      const { databases } = await teleportDatabases(store.selectedCluster, instanceName);
      store.setAvailableDatabases(databases);
    } catch (err: any) {
      store.setError(err.message || 'Failed to discover databases');
    } finally {
      store.setDiscoveringDatabases(false);
    }
  }, [store]);

  // Start live scan via SSE
  const startLiveScan = useCallback(() => {
    const { selectedCluster, selectedInstance, selectedDatabases } = useScanStore.getState();
    if (!selectedCluster || !selectedInstance || selectedDatabases.size === 0) return;

    // Reset previous results
    store.resetLiveScan();
    store.setLiveScanning(true);

    const url = teleportScanUrl(selectedCluster, selectedInstance, Array.from(selectedDatabases));
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: LiveScanEvent = JSON.parse(event.data);
        const s = useScanStore.getState();

        switch (data.type) {
          case 'progress':
            s.setStreamingProgress(data.message);
            break;
          case 'database_result':
            s.addDatabaseResult(data.database, data.partialSummary);
            break;
          case 'error':
            s.addScanError({ message: data.message, database: data.database });
            break;
          case 'done':
            s.finalizeLiveScan(data.summary, data.confluenceActive);
            es.close();
            eventSourceRef.current = null;
            break;
        }
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      const s = useScanStore.getState();
      if (s.liveScanning) {
        s.setLiveScanning(false);
        s.setStreamingProgress('');
      }
      es.close();
      eventSourceRef.current = null;
    };
  }, [store]);

  // Cancel live scan
  const cancelLiveScan = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    teleportCancel().catch(() => {});
    store.setLiveScanning(false);
    store.setStreamingProgress('');
  }, [store]);

  return {
    selectCluster,
    login,
    selectInstance,
    startLiveScan,
    cancelLiveScan,
  };
}
