import { useState } from 'react';
import { useScanStore } from '../../store/scan-store';
import { useExclusions } from '../../hooks/useExclusions';
import type { ConfidenceTier, PiiCategory } from '../../api/types';
import ClearExclusionsDialog from './ClearExclusionsDialog';

const TIERS: ConfidenceTier[] = ['critical', 'high', 'medium', 'low'];
const CATEGORIES: PiiCategory[] = [
  'identity', 'contact', 'personal', 'financial',
  'digital', 'medical', 'biometric', 'authentication',
];

const TIER_COLORS: Record<ConfidenceTier, { active: string; inactive: string }> = {
  critical: { active: 'bg-red-600 text-white', inactive: 'bg-gray-800 text-red-400 border-red-900/50' },
  high: { active: 'bg-orange-500 text-white', inactive: 'bg-gray-800 text-orange-400 border-orange-900/50' },
  medium: { active: 'bg-yellow-500 text-gray-900', inactive: 'bg-gray-800 text-yellow-400 border-yellow-900/50' },
  low: { active: 'bg-blue-600 text-white', inactive: 'bg-gray-800 text-blue-400 border-blue-900/50' },
};

export default function FilterBar() {
  const {
    results,
    tierFilter,
    categoryFilter,
    searchQuery,
    excludeConfluence,
    toggleTier,
    toggleCategory,
    setSearchQuery,
    toggleExcludeConfluence,
    expandAll,
    collapseAll,
    exclusions,
    showExcluded,
    toggleShowExcluded,
  } = useScanStore();

  const { clearAll } = useExclusions();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  if (!results) return null;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search columns..."
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Tier filters */}
      <div>
        <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Confidence</div>
        <div className="flex flex-wrap gap-1">
          {TIERS.map((tier) => {
            const active = tierFilter.has(tier);
            const count = results.summary.byTier[tier];
            if (count === 0) return null;
            const colors = TIER_COLORS[tier];
            return (
              <button
                key={tier}
                onClick={() => toggleTier(tier)}
                className={`px-2 py-0.5 text-[11px] rounded border transition-colors ${
                  active ? colors.active + ' border-transparent' : colors.inactive
                }`}
              >
                {tier} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Category filters */}
      <div>
        <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Category</div>
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((cat) => {
            const active = categoryFilter.has(cat);
            const count = results.summary.byCategory[cat];
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-2 py-0.5 text-[11px] rounded border transition-colors ${
                  active
                    ? 'bg-gray-200 text-gray-900 border-transparent'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Confluence filter */}
      {results.confluenceActive && (
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={excludeConfluence}
              onChange={toggleExcludeConfluence}
              className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-[11px] text-gray-400">
              Exclude Confluence matches
            </span>
          </label>
        </div>
      )}

      {/* Exclusions controls */}
      {exclusions.length > 0 && (
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showExcluded}
              onChange={toggleShowExcluded}
              className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-[11px] text-gray-400">
              Show excluded ({exclusions.length})
            </span>
          </label>
          <button
            onClick={() => setClearDialogOpen(true)}
            className="text-[11px] text-red-400/70 hover:text-red-300 transition-colors"
          >
            Clear all exclusions
          </button>
        </div>
      )}

      {/* Expand/Collapse */}
      <div className="flex gap-2">
        <button
          onClick={expandAll}
          className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          Expand all
        </button>
        <button
          onClick={collapseAll}
          className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          Collapse all
        </button>
      </div>

      {clearDialogOpen && (
        <ClearExclusionsDialog
          count={exclusions.length}
          onConfirm={() => {
            clearAll();
            setClearDialogOpen(false);
          }}
          onCancel={() => setClearDialogOpen(false)}
        />
      )}
    </div>
  );
}
