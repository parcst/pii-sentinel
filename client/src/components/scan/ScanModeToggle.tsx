import { useScanStore } from '../../store/scan-store';
import type { ScanMode } from '../../api/types';

export default function ScanModeToggle() {
  const { scanMode, setScanMode, tshAvailable } = useScanStore();

  const modes: { value: ScanMode; label: string }[] = [
    { value: 'directory', label: 'Directory' },
    { value: 'live', label: 'Live Database' },
  ];

  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-700">
      {modes.map(({ value, label }) => {
        const isActive = scanMode === value;
        const isDisabled = value === 'live' && tshAvailable === false;

        return (
          <button
            key={value}
            onClick={() => !isDisabled && setScanMode(value)}
            disabled={isDisabled}
            className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-red-600 text-white'
                : isDisabled
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
            title={isDisabled ? 'tsh binary not found' : undefined}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
