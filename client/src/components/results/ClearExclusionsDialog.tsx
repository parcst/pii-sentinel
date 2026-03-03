interface Props {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ClearExclusionsDialog({ count, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-[400px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-200">Clear All Exclusions</h2>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-gray-400">
            Remove all {count} exclusion{count !== 1 ? 's' : ''}? This cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-800">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}
