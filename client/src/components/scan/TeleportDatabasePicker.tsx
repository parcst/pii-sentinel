import { useScanStore } from '../../store/scan-store';

export default function TeleportDatabasePicker() {
  const {
    availableDatabases,
    selectedDatabases,
    discoveringDatabases,
    toggleSelectedDatabase,
    selectAllDatabases,
    deselectAllDatabases,
  } = useScanStore();

  if (discoveringDatabases) {
    return (
      <div className="text-xs text-gray-400 flex items-center gap-2">
        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Discovering databases...
      </div>
    );
  }

  if (availableDatabases.length === 0) return null;

  const allSelected = selectedDatabases.size === availableDatabases.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-gray-400">
          Databases ({selectedDatabases.size}/{availableDatabases.length})
        </label>
        <button
          onClick={allSelected ? deselectAllDatabases : selectAllDatabases}
          className="text-xs text-red-400 hover:text-red-300"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <div className="max-h-40 overflow-y-auto border border-gray-700 rounded bg-gray-800/50 p-1.5 space-y-0.5">
        {availableDatabases.map((db) => (
          <label
            key={db}
            className="flex items-center gap-2 px-1.5 py-0.5 rounded hover:bg-gray-700/50 cursor-pointer text-xs"
          >
            <input
              type="checkbox"
              checked={selectedDatabases.has(db)}
              onChange={() => toggleSelectedDatabase(db)}
              className="rounded border-gray-600 bg-gray-700 text-red-500 focus:ring-red-500 focus:ring-offset-0 h-3 w-3"
            />
            <span className="text-gray-300 truncate">{db}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
