import { useState, useRef, useEffect } from 'react';

interface Props {
  displayPath: string;
  dbLabel: string;
  onConfirm: (scope: string) => void;
  onCancel: () => void;
}

export default function ExcludeScopePopover({ displayPath, dbLabel, onConfirm, onCancel }: Props) {
  const [scope, setScope] = useState<'global' | 'database'>('global');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCancel();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCancel]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 w-64"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-xs font-medium text-gray-300 mb-2">Exclusion scope</div>
      <label className="flex items-center gap-2 cursor-pointer mb-1.5">
        <input
          type="radio"
          name="scope"
          checked={scope === 'global'}
          onChange={() => setScope('global')}
          className="text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
        />
        <span className="text-xs text-gray-300">Exclude everywhere</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer mb-3">
        <input
          type="radio"
          name="scope"
          checked={scope === 'database'}
          onChange={() => setScope('database')}
          className="text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
        />
        <span className="text-xs text-gray-300">Only in {dbLabel}</span>
      </label>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(scope === 'global' ? 'global' : displayPath)}
          className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
        >
          Exclude
        </button>
      </div>
    </div>
  );
}
