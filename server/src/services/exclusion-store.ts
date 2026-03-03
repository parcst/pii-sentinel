import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const EXCLUSIONS_PATH = path.join(DATA_DIR, 'exclusions.json');

export interface ExclusionEntry {
  table: string;
  column: string;
  scope: 'global' | string;
  excludedBy: string;
  excludedAt: string;
}

export async function loadExclusions(): Promise<ExclusionEntry[]> {
  try {
    const raw = await fs.readFile(EXCLUSIONS_PATH, 'utf-8');
    return JSON.parse(raw) as ExclusionEntry[];
  } catch {
    return [];
  }
}

export async function saveExclusions(exclusions: ExclusionEntry[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(EXCLUSIONS_PATH, JSON.stringify(exclusions, null, 2), 'utf-8');
}

export function getOsUsername(): string {
  try {
    return os.userInfo().username;
  } catch {
    return 'unknown';
  }
}
