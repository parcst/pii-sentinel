import type { ConfidenceTier } from '../../api/types';

const TIER_STYLES: Record<ConfidenceTier, string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-gray-900',
  low: 'bg-blue-600 text-white',
};

interface Props {
  tier: ConfidenceTier;
  small?: boolean;
}

export default function ConfidenceBadge({ tier, small }: Props) {
  const sizeClass = small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center rounded font-medium uppercase tracking-wide ${TIER_STYLES[tier]} ${sizeClass}`}>
      {tier}
    </span>
  );
}
