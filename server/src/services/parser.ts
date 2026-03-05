import { Parser } from 'node-sql-parser';
import fs from 'fs/promises';
import { ParsedColumn, ParsedTable } from '../types.js';

const sqlParser = new Parser();

function extractTableName(raw: string): string {
  const match = raw.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i);
  return match?.[1] || 'unknown';
}

function buildDataType(def: any): string {
  const dataType = def?.dataType || 'unknown';
  if (def?.length) {
    if (def.scale !== undefined && def.scale !== null) {
      return `${dataType}(${def.length},${def.scale})`;
    }
    return `${dataType}(${def.length})`;
  }
  return dataType;
}

function columnDefToString(col: any): string {
  const parts: string[] = [];
  parts.push(buildDataType(col.definition));

  if (col.definition?.suffix?.includes('UNSIGNED')) {
    parts.push('UNSIGNED');
  }
  if (col.nullable?.type === 'not null') {
    parts.push('NOT NULL');
  } else if (col.nullable?.type === 'null') {
    parts.push('NULL');
  }
  if (col.default_val !== undefined && col.default_val !== null) {
    const dv = col.default_val;
    if (dv.value?.type === 'function') {
      parts.push(`DEFAULT ${dv.value.name?.name?.[0]?.value || dv.value.name || 'UNKNOWN'}()`);
    } else if (dv.value?.type === 'null') {
      parts.push('DEFAULT NULL');
    } else if (dv.value !== undefined && dv.value !== null) {
      const val = typeof dv.value === 'object' ? dv.value.value : dv.value;
      if (typeof val === 'string') {
        parts.push(`DEFAULT '${val}'`);
      } else {
        parts.push(`DEFAULT ${val}`);
      }
    }
  }
  if (col.auto_increment === 'auto_increment') {
    parts.push('AUTO_INCREMENT');
  }
  return parts.join(' ');
}

export function parseCreateTable(raw: string): ParsedTable {
  const tableName = extractTableName(raw);

  let ast: any;
  try {
    ast = sqlParser.astify(raw, { database: 'MySQL' });
  } catch {
    return fallbackParse(raw, tableName);
  }

  const stmt = Array.isArray(ast) ? ast[0] : ast;
  if (!stmt || stmt.type !== 'create' || stmt.keyword !== 'table') {
    return fallbackParse(raw, tableName);
  }

  const columns: ParsedColumn[] = [];
  const primaryKey: string[] = [];
  const defs = stmt.create_definitions || [];
  for (const def of defs) {
    if (def.resource === 'column') {
      columns.push({
        name: def.column?.column || 'unknown',
        dataType: buildDataType(def.definition).toUpperCase(),
        fullDefinition: columnDefToString(def),
      });
    } else if (
      def.resource === 'constraint' &&
      def.constraint_type === 'primary key' &&
      Array.isArray(def.definition)
    ) {
      for (const d of def.definition) {
        if (d.column) primaryKey.push(d.column);
      }
    }
  }

  return { tableName, columns, primaryKey, raw };
}

function fallbackParse(raw: string, tableName: string): ParsedTable {
  const columns: ParsedColumn[] = [];

  // Match lines that look like column definitions: `column_name` type...
  const colRegex = /^\s+`(\w+)`\s+(\w+(?:\([^)]*\))?(?:\s+unsigned)?)/gim;
  let match: RegExpExecArray | null;
  while ((match = colRegex.exec(raw)) !== null) {
    const name = match[1];
    const dataType = match[2].toUpperCase();
    // Get the full line as definition
    const lineEnd = raw.indexOf('\n', match.index);
    const fullLine = raw.substring(match.index, lineEnd === -1 ? undefined : lineEnd).trim();
    // Strip trailing comma
    const fullDefinition = fullLine.replace(/,\s*$/, '').replace(/^\s*`\w+`\s+/, '');

    columns.push({ name, dataType, fullDefinition });
  }

  // Extract PRIMARY KEY columns
  const primaryKey: string[] = [];
  const pkMatch = raw.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
  if (pkMatch) {
    const cols = pkMatch[1].split(',');
    for (const col of cols) {
      primaryKey.push(col.trim().replace(/`/g, ''));
    }
  }

  return { tableName, columns, primaryKey, raw };
}

export async function parseTableFile(filePath: string): Promise<ParsedTable> {
  const raw = await fs.readFile(filePath, 'utf-8');
  return parseCreateTable(raw);
}
