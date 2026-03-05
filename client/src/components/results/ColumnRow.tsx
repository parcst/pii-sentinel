import { useState } from 'react';
import type { PiiColumn, ScanMode } from '../../api/types';
import { createJiraTicket, verifyJiraTicket } from '../../api/client';
import { useScanStore } from '../../store/scan-store';
import ConfidenceBadge from './ConfidenceBadge';
import ExcludeScopePopover from './ExcludeScopePopover';
import DataSampleModal from './DataSampleModal';

interface Props {
  column: PiiColumn;
  tableName: string;
  displayPath: string;
  dbLabel: string;
  scanMode: ScanMode;
  connectionInfo?: { cluster: string; instance: string; database: string };
  primaryKey: string[];
  isExcluded: boolean;
  excludedBy: string | null;
  onExclude: (table: string, column: string, scope: string) => void;
  onInclude: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  identity: 'text-purple-400',
  contact: 'text-cyan-400',
  personal: 'text-pink-400',
  financial: 'text-emerald-400',
  digital: 'text-blue-400',
  medical: 'text-red-400',
  biometric: 'text-amber-400',
  authentication: 'text-gray-400',
};

export default function ColumnRow({ column, tableName, displayPath, dbLabel, scanMode, connectionInfo, primaryKey, isExcluded, excludedBy, onExclude, onInclude }: Props) {
  const onConfluence = column.matches.some(m => m.matchedOn === 'confluence');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dataSampleOpen, setDataSampleOpen] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const canSample = scanMode === 'live' && connectionInfo && primaryKey.length > 0;

  const jiraValid = useScanStore((s) => s.jiraValid);
  const jiraTickets = useScanStore((s) => s.jiraTickets);
  const addJiraTicket = useScanStore((s) => s.addJiraTicket);
  const removeJiraTicket = useScanStore((s) => s.removeJiraTicket);
  const setJiraToast = useScanStore((s) => s.setJiraToast);

  const isTicketed = jiraTickets.some(t => t.table === tableName && t.column === column.columnName);
  const canJira = jiraValid === true && !onConfluence && !isExcluded;

  const handleCreateTicket = async () => {
    setCreatingTicket(true);
    try {
      const result = await createJiraTicket({
        table: tableName,
        column: column.columnName,
        dataType: column.dataType,
        tier: column.highestTier,
        category: column.primaryCategory,
        location: displayPath,
      });
      addJiraTicket({
        table: tableName,
        column: column.columnName,
        ticketKeys: result.ticketKeys,
        ticketUrls: result.ticketUrls,
        createdBy: '',
        createdAt: new Date().toISOString(),
      });
      setJiraToast({ type: 'success', ticketKeys: result.ticketKeys, ticketUrls: result.ticketUrls });
    } catch (err: any) {
      setJiraToast({ type: 'error', message: err.message || 'Failed to create Jira ticket' });
    } finally {
      setCreatingTicket(false);
    }
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-1.5 hover:bg-gray-800/50 transition-colors ${isExcluded ? 'opacity-40' : ''}`}>
      <div className="w-5" />
      <div className="w-5" />
      <ConfidenceBadge tier={column.highestTier} small />
      <span className={`text-sm font-mono text-gray-200 min-w-[180px] ${isExcluded ? 'line-through' : ''}`}>
        {column.columnName}
      </span>
      <span className="text-xs font-mono text-gray-500 min-w-[120px]">{column.dataType}</span>
      <span className={`text-xs min-w-[90px] ${CATEGORY_COLORS[column.primaryCategory] || 'text-gray-500'}`}>
        {column.primaryCategory}
      </span>
      <span className={`text-xs font-medium w-[70px] text-center ${onConfluence ? 'text-blue-400' : 'text-gray-600'}`}>
        {onConfluence ? 'Y' : 'N'}
      </span>
      <span className="text-xs text-gray-500 truncate max-w-[200px]">
        {isExcluded && excludedBy ? (
          <span className="text-gray-600 italic">excluded by {excludedBy}</span>
        ) : (
          column.matches[0]?.label
        )}
      </span>
      {/* Actions */}
      <div className="ml-auto flex items-center gap-1 relative">
        {canSample && !isExcluded && (
          <button
            onClick={(e) => { e.stopPropagation(); setDataSampleOpen(true); }}
            className="px-2 py-0.5 text-[11px] text-blue-400 hover:text-blue-300 border border-blue-800 hover:border-blue-600 rounded transition-colors"
          >
            Data Sample
          </button>
        )}
        {isTicketed && (() => {
          const ticket = jiraTickets.find(t => t.table === tableName && t.column === column.columnName);
          if (!ticket) return null;
          return (
            <span className="px-2 py-0.5 text-[11px] flex items-center gap-1">
              {ticket.ticketKeys.map((key, i) => (
                <span key={key}>
                  {i > 0 && <span className="text-gray-600 mx-0.5">/</span>}
                  <a
                    href={ticket.ticketUrls[i]}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Background verify: if ticket was deleted, revert to Jira button
                      verifyJiraTicket({ table: tableName, column: column.columnName })
                        .then((result) => {
                          if (!result.exists) {
                            removeJiraTicket(tableName, column.columnName);
                          }
                        })
                        .catch(() => {}); // ignore errors, link still opens
                    }}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    {key}
                  </a>
                </span>
              ))}
            </span>
          );
        })()}
        {canJira && !isTicketed && (
          <button
            onClick={(e) => { e.stopPropagation(); handleCreateTicket(); }}
            disabled={creatingTicket}
            className="px-2 py-0.5 text-[11px] text-orange-400 hover:text-orange-300 border border-orange-800 hover:border-orange-600 rounded transition-colors disabled:opacity-50"
          >
            {creatingTicket ? 'Creating...' : 'Jira'}
          </button>
        )}
        {!onConfluence && !isExcluded && (
          <button
            onClick={(e) => { e.stopPropagation(); setPopoverOpen(true); }}
            className="px-2 py-0.5 text-[11px] text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 rounded transition-colors"
          >
            Exclude
          </button>
        )}
        {!onConfluence && isExcluded && (
          <button
            onClick={(e) => { e.stopPropagation(); onInclude(); }}
            className="px-2 py-0.5 text-[11px] text-blue-400 hover:text-blue-300 border border-blue-800 hover:border-blue-600 rounded transition-colors"
          >
            Include
          </button>
        )}
        {popoverOpen && (
          <ExcludeScopePopover
            displayPath={displayPath}
            dbLabel={dbLabel}
            onConfirm={(scope) => {
              setPopoverOpen(false);
              onExclude(tableName, column.columnName, scope);
            }}
            onCancel={() => setPopoverOpen(false)}
          />
        )}
      </div>
      {dataSampleOpen && connectionInfo && (
        <DataSampleModal
          cluster={connectionInfo.cluster}
          instance={connectionInfo.instance}
          database={connectionInfo.database}
          table={tableName}
          column={column.columnName}
          pkColumn={primaryKey[0]}
          onClose={() => setDataSampleOpen(false)}
        />
      )}
    </div>
  );
}
