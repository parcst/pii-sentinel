import { useState, useEffect } from 'react';
import { fetchDataSample } from '../../api/client';
import type { DataSampleResponse } from '../../api/types';

interface Props {
  cluster: string;
  instance: string;
  database: string;
  table: string;
  column: string;
  pkColumn: string;
  onClose: () => void;
}

export default function DataSampleModal({ cluster, instance, database, table, column, pkColumn, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DataSampleResponse | null>(null);

  const sql = `SELECT \`${pkColumn}\`, \`${column}\` FROM \`${database}\`.\`${table}\` ORDER BY \`${pkColumn}\` DESC LIMIT 10`;

  useEffect(() => {
    let cancelled = false;
    fetchDataSample({ cluster, instance, database, table, column, pkColumn })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to fetch data sample');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [cluster, instance, database, table, column, pkColumn]);

  function renderValue(val: unknown) {
    if (val === null || val === undefined) {
      return <span className="italic text-gray-600">NULL</span>;
    }
    return String(val);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-[600px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Data Sample</h2>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{table}.{column}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors text-lg leading-none px-1"
          >
            &times;
          </button>
        </div>

        {/* SQL preview */}
        <div className="px-5 py-3 border-b border-gray-800">
          <pre className="text-[11px] text-gray-500 font-mono whitespace-pre-wrap break-all">{sql}</pre>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="animate-spin h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Querying database...
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {data && data.rows.length === 0 && (
            <p className="text-sm text-gray-500">No rows returned</p>
          )}

          {data && data.rows.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider pb-2 pr-4">{data.columns[0]}</th>
                  <th className="text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider pb-2">{data.columns[1]}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="py-1.5 pr-4 font-mono text-xs text-gray-400">{renderValue(row[0])}</td>
                    <td className="py-1.5 font-mono text-xs text-gray-200">{renderValue(row[1])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
