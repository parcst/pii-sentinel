export default function Header() {
  return (
    <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-800 bg-gray-950">
      <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white font-bold text-sm">
        PS
      </div>
      <div>
        <h1 className="text-lg font-semibold text-gray-100">PII Sentinel</h1>
        <p className="text-xs text-gray-500">Scan RDS schema dumps for PII columns</p>
      </div>
    </header>
  );
}
