import { JiraConfig } from '../types.js';

export interface CreateTicketParams {
  table: string;
  column: string;
  dataType: string;
  tier: string;
  category: string;
  location: string;
  reportedBy: string;
}

function makeAuth(config: JiraConfig): string {
  return Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
}

/**
 * Validate Jira connection by checking both project keys exist.
 */
export async function validateJiraConnection(config: JiraConfig): Promise<{ success: boolean; error?: string }> {
  const auth = makeAuth(config);

  for (const key of config.projectKeys) {
    const url = `${config.baseUrl}/rest/api/3/project/${encodeURIComponent(key)}`;
    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      });
      if (!res.ok) {
        const body = await res.text();
        return { success: false, error: `Project ${key}: ${res.status} ${res.statusText} — ${body}` };
      }
    } catch (err: any) {
      return { success: false, error: `Project ${key}: ${err.message}` };
    }
  }

  return { success: true };
}

interface CreatemataField {
  fieldId: string;
  required: boolean;
  name: string;
  schema: { type: string; custom?: string };
  allowedValues?: Array<{ id: string; value?: string; name?: string }>;
}

/**
 * Fetch required custom fields for a Bug issue type on a project via createmeta.
 * Returns a map of fieldId -> value to include in the create payload.
 */
async function getRequiredCustomFields(
  config: JiraConfig,
  projectKey: string,
  auth: string
): Promise<Record<string, unknown>> {
  // First, get the Bug issue type ID for this project
  const typesUrl = `${config.baseUrl}/rest/api/3/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes`;
  const typesRes = await fetch(typesUrl, {
    headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
  });
  if (!typesRes.ok) return {};

  const typesData = await typesRes.json() as { issueTypes: Array<{ id: string; name: string }> };
  const bugType = typesData.issueTypes.find(t => t.name === 'Bug');
  if (!bugType) return {};

  // Then, get the fields for that issue type
  const fieldsUrl = `${config.baseUrl}/rest/api/3/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes/${bugType.id}`;
  const fieldsRes = await fetch(fieldsUrl, {
    headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
  });
  if (!fieldsRes.ok) return {};

  const fieldsData = await fieldsRes.json() as { fields?: CreatemataField[]; values?: CreatemataField[] };
  const fields = fieldsData.fields ?? fieldsData.values ?? [];

  const customFields: Record<string, unknown> = {};

  // Standard fields we already set — skip these
  const standardFields = new Set(['project', 'issuetype', 'summary', 'description', 'reporter']);

  for (const field of fields) {
    if (!field.required) continue;
    if (standardFields.has(field.fieldId)) continue;
    if (!field.fieldId.startsWith('customfield_')) continue;

    // For select/radio fields with allowed values, pick the first one
    if (field.allowedValues && field.allowedValues.length > 0) {
      customFields[field.fieldId] = { id: field.allowedValues[0].id };
    }
  }

  return customFields;
}

/**
 * Create a Bug ticket on a single Jira project.
 * Auto-discovers and fills required custom fields via createmeta.
 */
async function createSingleTicket(
  config: JiraConfig,
  projectKey: string,
  params: CreateTicketParams
): Promise<{ key: string; url: string }> {
  const auth = makeAuth(config);
  const url = `${config.baseUrl}/rest/api/3/issue`;

  const summary = `PII: ${params.table}.${params.column} (${params.tier}) - reported by ${params.reportedBy}`;

  // Auto-fill required custom fields
  const customFields = await getRequiredCustomFields(config, projectKey, auth);

  const body = {
    fields: {
      project: { key: projectKey },
      issuetype: { name: 'Bug' },
      summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `PII column detected by PII Sentinel.\n\nTable: ${params.table}\nColumn: ${params.column}\nData Type: ${params.dataType}\nTier: ${params.tier}\nCategory: ${params.category}\nDatabase Location: ${params.location}\nReported By: ${params.reportedBy}`,
              },
            ],
          },
        ],
      },
      ...customFields,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Failed to create ticket on ${projectKey}: ${res.status} ${res.statusText} — ${errBody}`);
  }

  const data = await res.json() as { key: string; self: string };
  return {
    key: data.key,
    url: `${config.baseUrl}/browse/${data.key}`,
  };
}

/**
 * Check if a Jira ticket still exists (not deleted).
 * Returns true if the ticket exists, false if deleted/not found.
 */
export async function verifyJiraTicketExists(
  config: JiraConfig,
  ticketKey: string
): Promise<boolean> {
  const auth = makeAuth(config);
  const url = `${config.baseUrl}/rest/api/3/issue/${encodeURIComponent(ticketKey)}?fields=status`;
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    });
    return res.ok;
  } catch {
    // Network error — assume ticket still exists to avoid false removal
    return true;
  }
}

/**
 * Create Bug tickets on both configured Jira projects.
 */
export async function createJiraTickets(
  config: JiraConfig,
  params: CreateTicketParams
): Promise<{ ticketKeys: string[]; ticketUrls: string[] }> {
  const results = await Promise.all(
    config.projectKeys.map((key) => createSingleTicket(config, key, params))
  );

  return {
    ticketKeys: results.map((r) => r.key),
    ticketUrls: results.map((r) => r.url),
  };
}
