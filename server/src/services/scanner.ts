import fs from 'fs/promises';
import path from 'path';
import { LocationInfo } from '../types.js';

async function walkDir(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDir(full)));
    } else if (entry.isFile() && entry.name.endsWith('.sql')) {
      files.push(full);
    }
  }
  return files;
}

export async function discoverTableFiles(rootDir: string): Promise<string[]> {
  const allFiles = await walkDir(rootDir);
  return allFiles.filter((f) => {
    const parts = f.split(path.sep);
    const tablesIdx = parts.lastIndexOf('tables');
    return tablesIdx !== -1 && tablesIdx < parts.length - 1;
  });
}

export function extractLocation(filePath: string, rootDir: string): LocationInfo {
  const rel = path.relative(rootDir, filePath);
  const parts = rel.split(path.sep);

  // Path structure: {cluster}/{connection}/{region}/{instance}/{database}/tables/{table}.sql
  // Walk backwards from the 'tables' directory
  const tablesIdx = parts.lastIndexOf('tables');

  if (tablesIdx >= 5) {
    return {
      cluster: parts[tablesIdx - 5],
      connection: parts[tablesIdx - 4],
      region: parts[tablesIdx - 3],
      instance: parts[tablesIdx - 2],
      database: parts[tablesIdx - 1],
    };
  }

  // Fewer segments — fill what we can from right-to-left above 'tables'
  const segments = parts.slice(0, tablesIdx).reverse();
  return {
    database: segments[0] || 'unknown',
    instance: segments[1] || 'unknown',
    region: segments[2] || 'unknown',
    connection: segments[3] || 'unknown',
    cluster: segments[4] || 'unknown',
  };
}
