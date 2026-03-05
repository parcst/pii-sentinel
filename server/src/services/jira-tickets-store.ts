import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const TICKETS_PATH = path.join(DATA_DIR, 'jira-tickets.json');

export interface JiraTicketEntry {
  table: string;
  column: string;
  ticketKeys: string[];
  ticketUrls: string[];
  createdBy: string;
  createdAt: string;
}

export async function loadJiraTickets(): Promise<JiraTicketEntry[]> {
  try {
    const raw = await fs.readFile(TICKETS_PATH, 'utf-8');
    return JSON.parse(raw) as JiraTicketEntry[];
  } catch {
    return [];
  }
}

export async function saveJiraTickets(tickets: JiraTicketEntry[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TICKETS_PATH, JSON.stringify(tickets, null, 2), 'utf-8');
}

export function findExistingTicket(
  entries: JiraTicketEntry[],
  table: string,
  column: string
): JiraTicketEntry | undefined {
  return entries.find((e) => e.table === table && e.column === column);
}
