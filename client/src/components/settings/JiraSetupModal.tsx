import { useState, useEffect } from 'react';
import { useScanStore } from '../../store/scan-store';
import { saveJiraConfig, removeJiraConfig, testJiraConnection, validateJiraConnection } from '../../api/client';
import type { JiraTestResult } from '../../api/types';

interface Props {
  onSaved: () => void;
}

export default function JiraSetupModal({ onSaved }: Props) {
  const open = useScanStore((s) => s.jiraSetupOpen);
  const setOpen = useScanStore((s) => s.setJiraSetupOpen);
  const jiraStatus = useScanStore((s) => s.jiraStatus);

  const isConfigured = !!jiraStatus?.configured;
  const confluenceCreds = jiraStatus?.confluenceCredentials;

  const [baseUrl, setBaseUrl] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [overrideToken, setOverrideToken] = useState(false);
  const [projectKey1, setProjectKey1] = useState('');
  const [projectKey2, setProjectKey2] = useState('');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<JiraTestResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Read fresh from store to avoid stale closure
    const status = useScanStore.getState().jiraStatus;
    const creds = status?.confluenceCredentials;

    if (status?.configured) {
      setBaseUrl(status.baseUrl ?? '');
      setEmail(status.email ?? '');
      setApiToken('');
      setProjectKey1(status.projectKeys?.[0] ?? '');
      setProjectKey2(status.projectKeys?.[1] ?? '');
    } else {
      // Pre-populate from Confluence if available
      setBaseUrl(creds?.baseUrl ?? '');
      setEmail(creds?.email ?? '');
      setApiToken('');
      setProjectKey1('');
      setProjectKey2('');
    }
    setOverrideToken(false);
    setTestResult(null);
    setError(null);
  }, [open]);

  if (!open) return null;

  // API token is optional when Confluence is linked (server will reuse it)
  const tokenOptional = !!confluenceCreds;
  const tokenReady = (tokenOptional && !overrideToken) || apiToken.trim() || isConfigured;
  const formValid = baseUrl.trim() && email.trim() && tokenReady && projectKey1.trim();

  const getConfig = () => ({
    baseUrl: baseUrl.trim().replace(/\/+$/, ''),
    email: email.trim(),
    apiToken: apiToken.trim(), // empty string is fine — server falls back to Confluence token
    projectKey1: projectKey1.trim().toUpperCase(),
    projectKey2: projectKey2.trim() ? projectKey2.trim().toUpperCase() : '',
  });

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      // If no token provided but already configured, test the stored config
      const usingSharedToken = tokenOptional && !overrideToken;
      if (!apiToken.trim() && !usingSharedToken && isConfigured) {
        const result = await validateJiraConnection();
        setTestResult(result);
      } else {
        const result = await testJiraConnection(getConfig());
        setTestResult(result);
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveJiraConfig(getConfig());
      const s = useScanStore.getState();
      s.setJiraValid(true);
      s.setJiraValidationError(null);
      onSaved();
      setOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    setError(null);
    try {
      await removeJiraConfig();
      useScanStore.getState().setJiraValid(null);
      onSaved();
      setOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-[520px] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-200">Jira Setup</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {tokenOptional && !isConfigured && (
            <div className="rounded-lg bg-emerald-950/30 border border-emerald-800/30 px-4 py-3">
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                Confluence is linked — Base URL, Email, and API token have been pre-filled. Just add your two project keys.
              </p>
            </div>
          )}

          <details className="group">
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
              <span className="text-xs text-gray-400 mb-1 block">Jira Base URL</span>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://your-org.atlassian.net"
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
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
              <span className="text-xs text-gray-400 mb-1 block">
                API Token
                {tokenOptional && !overrideToken && (
                  <span className="text-emerald-400/70 ml-1">— using Confluence token</span>
                )}
              </span>
              {tokenOptional && !overrideToken ? (
                <div className="relative">
                  <input
                    type="password"
                    value="confluence-token-linked"
                    readOnly
                    className="w-full px-3 py-2 text-sm bg-gray-800/50 border border-emerald-800/50 rounded text-emerald-300/70 cursor-default focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => { setOverrideToken(true); setApiToken(''); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Override
                  </button>
                </div>
              ) : (
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder={isConfigured ? 'Re-enter to change, or leave blank to keep current' : 'Atlassian API token'}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              )}
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-gray-400 mb-1 block">Project Key 1</span>
                <input
                  type="text"
                  value={projectKey1}
                  onChange={(e) => setProjectKey1(e.target.value)}
                  placeholder="e.g. DATA"
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 uppercase"
                />
              </label>

              <label className="block">
                <span className="text-xs text-gray-400 mb-1 block">Project Key 2 <span className="text-gray-600">(optional)</span></span>
                <input
                  type="text"
                  value={projectKey2}
                  onChange={(e) => setProjectKey2(e.target.value)}
                  placeholder="e.g. SEC"
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 uppercase"
                />
              </label>
            </div>
          </div>

          {testResult && (
            <div className={`rounded px-3 py-2 text-xs ${testResult.success ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-200' : 'bg-red-950/40 border border-red-800/40 text-red-200'}`}>
              {testResult.success
                ? 'Connection successful — both projects validated'
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
            {isConfigured && (
              <button
                onClick={handleRemove}
                disabled={saving}
                className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
              >
                Remove
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
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
