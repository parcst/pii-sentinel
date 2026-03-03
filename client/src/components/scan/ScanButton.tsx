interface Props {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
}

export default function ScanButton({ onClick, loading, disabled }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full py-2.5 text-sm font-medium rounded bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white transition-colors"
    >
      {loading ? 'Scanning...' : 'Scan for PII'}
    </button>
  );
}
