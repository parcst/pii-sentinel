import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConfluenceConfig, JiraConfig } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

interface AppConfig {
  confluence?: ConfluenceConfig;
  jira?: JiraConfig;
}

export async function loadConfig(): Promise<AppConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as AppConfig;
  } catch {
    return {};
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export async function clearConfluenceConfig(): Promise<void> {
  const config = await loadConfig();
  delete config.confluence;
  await saveConfig(config);
}

export async function clearJiraConfig(): Promise<void> {
  const config = await loadConfig();
  delete config.jira;
  await saveConfig(config);
}
