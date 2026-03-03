import { useState, useCallback } from 'react';
import { validatePath } from '../../api/client';
import DirectoryBrowser from './DirectoryBrowser';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function FolderInput({ value, onChange }: Props) {
  const [valid, setValid] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);

  const check = useCallback(async (path: string) => {
    if (!path) {
      setValid(null);
      return;
    }
    setChecking(true);
    try {
      const res = await validatePath(path);
      setValid(res.valid);
    } catch {
      setValid(false);
    } finally {
      setChecking(false);
    }
  }, []);

  const handleSelect = (path: string) => {
    onChange(path);
    setValid(true);
  };

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
        Schema Dump Directory
      </label>
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setValid(null);
            }}
            onBlur={() => check(value)}
            placeholder="/path/to/schema/dump"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
          {checking && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              ...
            </span>
          )}
          {!checking && valid === true && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-green-400">
              OK
            </span>
          )}
          {!checking && valid === false && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-red-400">
              Invalid
            </span>
          )}
        </div>
        <button
          onClick={() => setBrowserOpen(true)}
          className="px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors shrink-0"
          title="Browse..."
        >
          &#128194;
        </button>
      </div>
      <DirectoryBrowser
        open={browserOpen}
        onClose={() => setBrowserOpen(false)}
        onSelect={handleSelect}
        initialPath={value || undefined}
      />
    </div>
  );
}
