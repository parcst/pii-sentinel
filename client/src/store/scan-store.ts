import { create } from 'zustand';
import type { ScanResponse, ScanSummary, DatabaseResult, ConfidenceTier, PiiCategory, ScanMode, TeleportInstance, TeleportStatus, ConfluenceStatus } from '../api/types';

interface ScanStore {
  // Scan mode
  scanMode: ScanMode;

  // Directory mode state
  scanPath: string;
  results: ScanResponse | null;
  loading: boolean;
  error: string | null;

  // Teleport state
  tshAvailable: boolean | null;
  clusters: string[];
  selectedCluster: string;
  loginStatus: TeleportStatus | null;
  instances: TeleportInstance[];
  selectedInstance: string;
  availableDatabases: string[];
  selectedDatabases: Set<string>;
  discoveringDatabases: boolean;

  // Streaming state (live mode)
  streamingProgress: string;
  scanErrors: Array<{ message: string; database?: string }>;
  liveScanning: boolean;

  // Filters
  tierFilter: Set<ConfidenceTier>;
  categoryFilter: Set<PiiCategory>;
  searchQuery: string;
  excludeConfluence: boolean;

  // Confluence setup
  confluenceStatus: ConfluenceStatus | null;
  confluenceSetupOpen: boolean;
  pendingScanAction: (() => void) | null;
  confluenceValidationError: string | null;
  confluenceValid: boolean | null; // null = not checked, true = working, false = broken

  // UI state
  expandedDatabases: Set<string>;
  expandedTables: Set<string>;

  // Confluence actions
  setConfluenceStatus: (status: ConfluenceStatus | null) => void;
  setConfluenceSetupOpen: (open: boolean) => void;
  setPendingScanAction: (action: (() => void) | null) => void;
  setConfluenceValidationError: (error: string | null) => void;
  setConfluenceValid: (valid: boolean | null) => void;

  // Actions
  setScanMode: (mode: ScanMode) => void;
  setScanPath: (path: string) => void;
  setResults: (results: ScanResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleTier: (tier: ConfidenceTier) => void;
  toggleCategory: (category: PiiCategory) => void;
  setSearchQuery: (query: string) => void;
  toggleExcludeConfluence: () => void;
  toggleExpandDatabase: (dbKey: string) => void;
  toggleTable: (tableKey: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  reset: () => void;

  // Teleport actions
  setTshAvailable: (available: boolean) => void;
  setClusters: (clusters: string[]) => void;
  setSelectedCluster: (cluster: string) => void;
  setLoginStatus: (status: TeleportStatus | null) => void;
  setInstances: (instances: TeleportInstance[]) => void;
  setSelectedInstance: (instance: string) => void;
  setAvailableDatabases: (databases: string[]) => void;
  toggleSelectedDatabase: (db: string) => void;
  selectAllDatabases: () => void;
  deselectAllDatabases: () => void;
  setDiscoveringDatabases: (discovering: boolean) => void;

  // Live scan actions
  setStreamingProgress: (msg: string) => void;
  addScanError: (error: { message: string; database?: string }) => void;
  setLiveScanning: (scanning: boolean) => void;
  addDatabaseResult: (database: DatabaseResult, partialSummary: ScanSummary) => void;
  finalizeLiveScan: (summary: ScanSummary, confluenceActive: boolean) => void;
  resetLiveScan: () => void;
}

export const useScanStore = create<ScanStore>((set, get) => ({
  // Scan mode
  scanMode: 'directory',

  // Directory mode state
  scanPath: '',
  results: null,
  loading: false,
  error: null,

  // Teleport state
  tshAvailable: null,
  clusters: [],
  selectedCluster: '',
  loginStatus: null,
  instances: [],
  selectedInstance: '',
  availableDatabases: [],
  selectedDatabases: new Set<string>(),
  discoveringDatabases: false,

  // Confluence setup
  confluenceStatus: null,
  confluenceSetupOpen: false,
  pendingScanAction: null,
  confluenceValidationError: null,
  confluenceValid: null,

  // Streaming state
  streamingProgress: '',
  scanErrors: [],
  liveScanning: false,

  // Filters
  tierFilter: new Set<ConfidenceTier>(),
  categoryFilter: new Set<PiiCategory>(),
  searchQuery: '',
  excludeConfluence: false,

  // UI state
  expandedDatabases: new Set<string>(),
  expandedTables: new Set<string>(),

  // Confluence actions
  setConfluenceStatus: (status) => set({ confluenceStatus: status }),
  setConfluenceSetupOpen: (open) => set({ confluenceSetupOpen: open }),
  setPendingScanAction: (action) => set({ pendingScanAction: action }),
  setConfluenceValidationError: (error) => set({ confluenceValidationError: error }),
  setConfluenceValid: (valid) => set({ confluenceValid: valid }),

  // Actions
  setScanMode: (mode) => set({ scanMode: mode }),
  setScanPath: (path) => set({ scanPath: path }),
  setResults: (results) => {
    const expandedDatabases = new Set<string>();
    if (results) {
      for (const db of results.databases) {
        expandedDatabases.add(db.displayPath);
      }
    }
    set({ results, expandedDatabases, expandedTables: new Set() });
  },
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  toggleTier: (tier) => {
    const next = new Set(get().tierFilter);
    if (next.has(tier)) next.delete(tier);
    else next.add(tier);
    set({ tierFilter: next });
  },

  toggleCategory: (category) => {
    const next = new Set(get().categoryFilter);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    set({ categoryFilter: next });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleExcludeConfluence: () => set({ excludeConfluence: !get().excludeConfluence }),

  toggleExpandDatabase: (dbKey) => {
    const next = new Set(get().expandedDatabases);
    if (next.has(dbKey)) next.delete(dbKey);
    else next.add(dbKey);
    set({ expandedDatabases: next });
  },

  toggleTable: (tableKey) => {
    const next = new Set(get().expandedTables);
    if (next.has(tableKey)) next.delete(tableKey);
    else next.add(tableKey);
    set({ expandedTables: next });
  },

  expandAll: () => {
    const { results } = get();
    if (!results) return;
    const expandedDatabases = new Set<string>();
    const expandedTables = new Set<string>();
    for (const db of results.databases) {
      expandedDatabases.add(db.displayPath);
      for (const table of db.tables) {
        expandedTables.add(`${db.displayPath}/${table.tableName}`);
      }
    }
    set({ expandedDatabases, expandedTables });
  },

  collapseAll: () => {
    set({ expandedDatabases: new Set(), expandedTables: new Set() });
  },

  reset: () => {
    set({
      results: null,
      loading: false,
      error: null,
      tierFilter: new Set(),
      categoryFilter: new Set(),
      searchQuery: '',
      excludeConfluence: false,
      expandedDatabases: new Set(),
      expandedTables: new Set(),
    });
  },

  // Teleport actions
  setTshAvailable: (available) => set({ tshAvailable: available }),
  setClusters: (clusters) => set({ clusters }),
  setSelectedCluster: (cluster) => set({
    selectedCluster: cluster,
    loginStatus: null,
    instances: [],
    selectedInstance: '',
    availableDatabases: [],
    selectedDatabases: new Set(),
  }),
  setLoginStatus: (status) => set({ loginStatus: status }),
  setInstances: (instances) => set({ instances }),
  setSelectedInstance: (instance) => set({
    selectedInstance: instance,
    availableDatabases: [],
    selectedDatabases: new Set(),
  }),
  setAvailableDatabases: (databases) => set({
    availableDatabases: databases,
    selectedDatabases: new Set(databases),
  }),
  toggleSelectedDatabase: (db) => {
    const next = new Set(get().selectedDatabases);
    if (next.has(db)) next.delete(db);
    else next.add(db);
    set({ selectedDatabases: next });
  },
  selectAllDatabases: () => set({ selectedDatabases: new Set(get().availableDatabases) }),
  deselectAllDatabases: () => set({ selectedDatabases: new Set() }),
  setDiscoveringDatabases: (discovering) => set({ discoveringDatabases: discovering }),

  // Live scan actions
  setStreamingProgress: (msg) => set({ streamingProgress: msg }),
  addScanError: (error) => set({ scanErrors: [...get().scanErrors, error] }),
  setLiveScanning: (scanning) => set({ liveScanning: scanning }),

  addDatabaseResult: (database, partialSummary) => {
    const prev = get().results;
    const databases = prev ? [...prev.databases, database] : [database];
    const confluenceActive = prev?.confluenceActive ?? false;

    // Auto-expand the new database
    const expandedDatabases = new Set(get().expandedDatabases);
    expandedDatabases.add(database.displayPath);

    set({
      results: { databases, summary: partialSummary, confluenceActive },
      expandedDatabases,
    });
  },

  finalizeLiveScan: (summary, confluenceActive) => {
    const prev = get().results;
    if (prev) {
      set({
        results: { ...prev, summary, confluenceActive },
        liveScanning: false,
        streamingProgress: '',
      });
    }
  },

  resetLiveScan: () => {
    set({
      results: null,
      streamingProgress: '',
      scanErrors: [],
      liveScanning: false,
      error: null,
      expandedDatabases: new Set(),
      expandedTables: new Set(),
    });
  },
}));
