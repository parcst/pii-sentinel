import { useEffect, useRef } from 'react';
import { useScanStore } from '../../store/scan-store';

export default function JiraToast() {
  const jiraToast = useScanStore((s) => s.jiraToast);
  const clearJiraToast = useScanStore((s) => s.clearJiraToast);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (jiraToast) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        clearJiraToast();
      }, jiraToast.type === 'error' ? 8000 : 5000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [jiraToast, clearJiraToast]);

  if (!jiraToast) return null;

  if (jiraToast.type === 'error') {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-lg">
        <div className="bg-gray-800 border border-red-700 rounded-lg shadow-xl px-4 py-2.5 flex items-center gap-3">
          <span className="text-sm text-red-200 truncate">
            Jira error: {jiraToast.message}
          </span>
          <button
            onClick={clearJiraToast}
            className="text-gray-500 hover:text-gray-300 text-sm leading-none ml-1 shrink-0"
          >
            &times;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-gray-800 border border-emerald-700 rounded-lg shadow-xl px-4 py-2.5 flex items-center gap-3">
        <span className="text-sm text-emerald-200">
          Tickets created:{' '}
          {jiraToast.ticketKeys.map((key, i) => (
            <span key={key}>
              {i > 0 && ', '}
              <a
                href={jiraToast.ticketUrls[i]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                {key}
              </a>
            </span>
          ))}
        </span>
        <button
          onClick={clearJiraToast}
          className="text-gray-500 hover:text-gray-300 text-sm leading-none ml-1"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
