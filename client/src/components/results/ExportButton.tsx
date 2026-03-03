import { useState } from 'react';
import { exportCSV } from '../../api/client';
import { useScanStore } from '../../store/scan-store';

export default function ExportButton() {
  const { results } = useScanStore();
  const [exporting, setExporting] = useState(false);

  if (!results) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportCSV(results.databases);
    } catch (err: any) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="w-full py-2 text-sm rounded border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100 disabled:text-gray-600 transition-colors"
    >
      {exporting ? 'Exporting...' : 'Export CSV'}
    </button>
  );
}
