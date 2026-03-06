import * as cheerio from 'cheerio';
import { ConfluenceConfig } from '../types.js';
import { getOsUsername } from './exclusion-store.js';

export interface TrackerRow {
  lob: string;
  databaseName: string;
  tableName: string;
  columnName: string;
  eddbaJiraKey: string;
  eddbaJiraUrl: string;
  dlJiraKey: string;
  dlJiraUrl: string;
}

/**
 * Append a row to the Confluence PII tracker page.
 * Fetches the page, parses the HTML table with cheerio, appends a new <tr>,
 * then PUTs the updated page back with an incremented version number.
 *
 * Fails gracefully — logs a warning on error, never throws.
 */
export async function updateTrackerPage(
  config: ConfluenceConfig,
  trackerPageId: string,
  row: TrackerRow,
): Promise<boolean> {
  try {
    const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    const baseHeaders = {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
    };

    // 1. Fetch the tracker page with body + version
    const getUrl = `${config.baseUrl}/wiki/rest/api/content/${trackerPageId}?expand=body.storage,version`;
    const getRes = await fetch(getUrl, { headers: baseHeaders });
    if (!getRes.ok) {
      console.warn(`Confluence tracker fetch failed: ${getRes.status} ${getRes.statusText}`);
      return false;
    }

    const pageData = await getRes.json() as {
      title: string;
      version: { number: number };
      body: { storage: { value: string } };
    };

    const html = pageData.body.storage.value;
    const currentVersion = pageData.version.number;

    // 2. Parse existing table and append row
    const $ = cheerio.load(html, { xmlMode: true });
    const table = $('table').first();
    if (table.length === 0) {
      console.warn('Confluence tracker page has no table — skipping update');
      return false;
    }

    const addedBy = getOsUsername();
    const dateAdded = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    let tbody = table.find('tbody');
    if (tbody.length === 0) {
      table.append('<tbody></tbody>');
      tbody = table.find('tbody');
    }

    const newRow = `<tr>
      <td><p>${escapeHtml(row.lob)}</p></td>
      <td><p>${escapeHtml(row.databaseName)}</p></td>
      <td><p>${escapeHtml(row.tableName)}</p></td>
      <td><p>${escapeHtml(row.columnName)}</p></td>
      <td><p>${escapeHtml(addedBy)}</p></td>
      <td><p>${dateAdded}</p></td>
      <td><p>${row.eddbaJiraUrl !== 'N/A' ? `<a href="${escapeHtml(row.eddbaJiraUrl)}">${escapeHtml(row.eddbaJiraKey)}</a>` : 'N/A'}</p></td>
      <td><p>${row.dlJiraUrl !== 'N/A' ? `<a href="${escapeHtml(row.dlJiraUrl)}">${escapeHtml(row.dlJiraKey)}</a>` : 'N/A'}</p></td>
    </tr>`;

    // Insert after the header row (first <tr>) so newest entries appear at top
    const headerRow = tbody.find('tr').first();
    if (headerRow.length > 0) {
      headerRow.after(newRow);
    } else {
      tbody.append(newRow);
    }

    // 3. PUT updated page
    const putUrl = `${config.baseUrl}/wiki/rest/api/content/${trackerPageId}`;
    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        ...baseHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: { number: currentVersion + 1 },
        title: pageData.title,
        type: 'page',
        body: {
          storage: {
            value: $.html(),
            representation: 'storage',
          },
        },
      }),
    });

    if (!putRes.ok) {
      const errText = await putRes.text().catch(() => '');
      console.warn(`Confluence tracker update failed: ${putRes.status} ${putRes.statusText} — ${errText}`);
      return false;
    }

    console.log(`Confluence tracker updated: ${row.tableName}.${row.columnName}`);
    return true;
  } catch (err: any) {
    console.warn(`Confluence tracker update error: ${err.message}`);
    return false;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
