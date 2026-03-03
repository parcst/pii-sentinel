import { DatabaseResult } from '../types.js';

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCSV(databases: DatabaseResult[]): string {
  const headers = [
    'Cluster',
    'Connection',
    'Region',
    'Instance',
    'Database',
    'Table',
    'Column',
    'Data Type',
    'Confidence Tier',
    'Category',
    'Label',
    'Matched Pattern',
    'Match Source',
  ];

  const rows: string[] = [headers.join(',')];

  for (const db of databases) {
    for (const table of db.tables) {
      for (const col of table.piiColumns) {
        for (const match of col.matches) {
          rows.push(
            [
              escapeCsv(db.location.cluster),
              escapeCsv(db.location.connection),
              escapeCsv(db.location.region),
              escapeCsv(db.location.instance),
              escapeCsv(db.location.database),
              escapeCsv(table.tableName),
              escapeCsv(col.columnName),
              escapeCsv(col.dataType),
              match.tier,
              match.category,
              escapeCsv(match.label),
              escapeCsv(match.pattern),
              match.matchedOn,
            ].join(',')
          );
        }
      }
    }
  }

  return rows.join('\n');
}
