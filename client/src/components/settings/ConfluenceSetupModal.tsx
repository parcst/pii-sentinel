import { useState, useEffect } from 'react';
import { useScanStore } from '../../store/scan-store';
import { saveConfluenceConfig, removeConfluenceConfig, testConfluenceConnection, parseConfluenceUrl } from '../../api/client';
import type { ConfluenceTestResult } from '../../api/types';

/** After saving new config, mark it as valid so scan gates pass immediately. */
function markConfluenceValid() {
  const s = useScanStore.getState();
  s.setConfluenceValid(true);
  s.setConfluenceValidationError(null);
}

interface Props {
  onSaved: () => void;
}

export default function ConfluenceSetupModal({ onSaved }: Props) {
  const open = useScanStore((s) => s.confluenceSetupOpen);
  const setOpen = useScanStore((s) => s.setConfluenceSetupOpen);
  const confluenceStatus = useScanStore((s) => s.confluenceStatus);
  const pendingScanAction = useScanStore((s) => s.pendingScanAction);
  const setPendingScanAction = useScanStore((s) => s.setPendingScanAction);
  const confluenceValidationError = useScanStore((s) => s.confluenceValidationError);
  const setConfluenceValidationError = useScanStore((s) => s.setConfluenceValidationError);

  const isConfigured = !!confluenceStatus?.configured;
  const hasPendingScan = !!pendingScanAction;
  const isGateMode = hasPendingScan && !isConfigured;
  const isValidationFailedMode = hasPendingScan && isConfigured;

  const [pageUrl, setPageUrl] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConfluenceTestResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && isConfigured) {
      setPageUrl(confluenceStatus?.pageUrl ?? '');
      setEmail(confluenceStatus?.email ?? '');
      setApiToken('');
    } else if (open) {
      setPageUrl('');
      setEmail('');
      setApiToken('');
    }
    setTestResult(null);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setConfluenceValidationError(null);
    }
  }, [open]);

  if (!open) return null;

  const parsed = pageUrl.trim() ? parseConfluenceUrl(pageUrl.trim()) : null;
  const urlValid = !!parsed;
  const formValid = urlValid && email.trim() && apiToken.trim();

  const getConfig = () => {
    if (!parsed) return null;
    return { baseUrl: parsed.baseUrl, email: email.trim(), apiToken: apiToken.trim(), pageId: parsed.pageId };
  };

  const handleTest = async () => {
    const config = getConfig();
    if (!config) return;
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const result = await testConfluenceConnection(config);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    const config = getConfig();
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      await saveConfluenceConfig(config);
      markConfluenceValid();
      onSaved();
      const action = useScanStore.getState().pendingScanAction;
      if (action) {
        setPendingScanAction(null);
        setOpen(false);
        action();
      } else {
        setOpen(false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleScanWithout = () => {
    const action = useScanStore.getState().pendingScanAction;
    setPendingScanAction(null);
    setOpen(false);
    if (action) action();
  };

  const handleRemove = async () => {
    setSaving(true);
    setError(null);
    try {
      await removeConfluenceConfig();
      useScanStore.getState().setConfluenceValid(null);
      onSaved();
      setOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setPendingScanAction(null);
    setOpen(false);
  };

  const title = isValidationFailedMode
    ? 'Confluence Connection Failed'
    : isGateMode
      ? 'Link Confluence PII Page'
      : 'Confluence Setup';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-[520px] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-200">{title}</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {isValidationFailedMode && confluenceValidationError && (
            <div className="rounded-lg bg-red-950/40 border border-red-800/30 px-4 py-3 space-y-1">
              <p className="text-sm font-medium text-red-200">Could not connect to Confluence</p>
              <p className="text-xs text-red-300/80">{confluenceValidationError}</p>
              <p className="text-xs text-red-200/50 pt-1">
                Update your credentials below, or scan without Confluence.
              </p>
            </div>
          )}

          {isGateMode && (
            <div className="rounded-lg bg-blue-950/40 border border-blue-800/30 px-4 py-3 space-y-2">
              <p className="text-sm text-blue-100/90 leading-relaxed">
                PII Sentinel can cross-reference your scan results with a Confluence PII reference page to highlight columns that have already been identified as PII.
              </p>
              <p className="text-xs text-blue-200/60 leading-relaxed">
                This is optional — you can scan without it.
              </p>
            </div>
          )}

          {/* API token instructions */}
          <details className="group" open={isGateMode}>
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300 select-none transition-colors">
              How to get an Atlassian API token
            </summary>
            <div className="mt-2 rounded bg-gray-800/60 border border-gray-700/50 px-3 py-2.5 text-xs text-gray-400 space-y-1.5">
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to <span className="text-blue-400">https://id.atlassian.com/manage-profile/security/api-tokens</span></li>
                <li>Click <strong className="text-gray-300">Create API token</strong></li>
                <li>Give it a label (e.g. "PII Sentinel") and click <strong className="text-gray-300">Create</strong></li>
                <li>Copy the token and paste it below</li>
              </ol>
            </div>
          </details>

          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-gray-400 mb-1 block">Confluence Page URL</span>
              <input
                type="url"
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                placeholder="https://your-org.atlassian.net/wiki/spaces/SPACE/pages/123456789/Page+Title"
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
              {pageUrl.trim() && !urlValid && (
                <p className="text-xs text-red-400 mt-1">Could not find a page ID in this URL. Paste the full Confluence page URL.</p>
              )}
            </label>

            <label className="block">
              <span className="text-xs text-gray-400 mb-1 block">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@company.com"
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </label>

            <label className="block">
              <span className="text-xs text-gray-400 mb-1 block">API Token</span>
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder={isConfigured ? 'Re-enter token to save changes' : 'Atlassian API token'}
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </label>
          </div>

          {testResult && (
            <div className={`rounded px-3 py-2 text-xs ${testResult.success ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-200' : 'bg-red-950/40 border border-red-800/40 text-red-200'}`}>
              {testResult.success
                ? `Connection successful — ${testResult.overrideCount} override${testResult.overrideCount === 1 ? '' : 's'} found`
                : `Connection failed: ${testResult.error}`}
            </div>
          )}

          {error && (
            <div className="rounded px-3 py-2 text-xs bg-red-950/40 border border-red-800/40 text-red-200">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-800">
          <div>
            {isConfigured && !hasPendingScan && (
              <button
                onClick={handleRemove}
                disabled={saving}
                className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
              >
                Remove
              </button>
            )}
            {hasPendingScan && (
              <button
                onClick={handleScanWithout}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 border border-gray-700 rounded transition-colors"
              >
                Scan Without Confluence
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTest}
              disabled={!formValid || testing}
              className="px-3 py-1.5 text-xs text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleClose}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formValid || saving}
              className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
            >
              {saving ? 'Saving...' : hasPendingScan ? 'Save & Scan' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
