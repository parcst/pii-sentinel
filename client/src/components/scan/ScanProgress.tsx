interface Props {
  loading: boolean;
  error: string | null;
}

export default function ScanProgress({ loading, error }: Props) {
  if (!loading && !error) return null;

  return (
    <div className="space-y-2">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-4 h-4 border-2 border-gray-600 border-t-red-500 rounded-full animate-spin" />
          <span>Scanning tables for PII patterns...</span>
        </div>
      )}
      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
