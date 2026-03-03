import { useEffect, useRef, useCallback } from 'react';
import { useScanStore } from '../../store/scan-store';
import { useExclusions } from '../../hooks/useExclusions';

export default function ExclusionToast() {
  const toastQueue = useScanStore((s) => s.toastQueue);
  const clearToast = useScanStore((s) => s.clearToast);
  const { include } = useExclusions();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      clearToast();
    }, 5000);
  }, [clearToast]);

  useEffect(() => {
    if (toastQueue.length > 0) {
      resetTimer();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toastQueue.length, resetTimer]);

  if (toastQueue.length === 0) return null;

  const handleUndo = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const items = [...toastQueue];
    clearToast();
    for (const item of items) {
      await include(item.entry);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl px-4 py-2.5 flex items-center gap-3">
        <span className="text-sm text-gray-200">
          {toastQueue.length} column{toastQueue.length !== 1 ? 's' : ''} excluded.
        </span>
        <button
          onClick={handleUndo}
          className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          Undo
        </button>
      </div>
    </div>
  );
}
