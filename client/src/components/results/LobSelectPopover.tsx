import { useState, useRef, useEffect } from 'react';

const LOB_OPTIONS = [
  'POS',
  'Punchh',
  'Ordering',
  'PARPAY',
  'DataCentral',
  'Delaget',
  'Retail',
  'Bridg',
  'Task',
];

interface Props {
  onConfirm: (lob: string) => void;
  onCancel: () => void;
}

export default function LobSelectPopover({ onConfirm, onCancel }: Props) {
  const [lob, setLob] = useState(LOB_OPTIONS[0]);
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
      className="absolute right-0 top-full mt-1 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 w-56"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-xs font-medium text-gray-300 mb-2">Line of Business</div>
      <select
        value={lob}
        onChange={(e) => setLob(e.target.value)}
        className="w-full px-2 py-1.5 text-xs bg-gray-900 border border-gray-600 rounded text-gray-200 focus:outline-none focus:border-blue-500 mb-3"
      >
        {LOB_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(lob)}
          className="px-3 py-1 text-xs bg-orange-600 hover:bg-orange-500 text-white rounded transition-colors"
        >
          Create
        </button>
      </div>
    </div>
  );
}
