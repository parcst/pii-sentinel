import mysql from 'mysql2/promise';
import { getActiveTunnel, findTsh, getLoginStatus, startTunnel, stopTunnel, registerTunnel, unregisterTunnel } from './teleport.js';

export interface DataSampleParams {
  cluster: string;
  instance: string;
  database: string;
  table: string;
  column: string;
  pkColumn: string;
}

export interface DataSampleResult {
  sql: string;
  columns: [string, string];
  rows: Array<[unknown, unknown]>;
}

export async function fetchDataSample(params: DataSampleParams): Promise<DataSampleResult> {
  const { cluster, instance, database, table, column, pkColumn } = params;

  // Reuse existing tunnel if available, otherwise start a new one
  let tunnel = getActiveTunnel(instance);
  const ownsTunnel = !tunnel;

  if (!tunnel) {
    const tsh = await findTsh();
    const status = await getLoginStatus(tsh, cluster);
    if (!status.loggedIn || !status.username) {
      throw new Error('Not logged in to Teleport. Please log in first.');
    }
    tunnel = await startTunnel(tsh, instance, status.username, cluster);
    registerTunnel(tunnel);
  }

  const sql = `SELECT \`${pkColumn}\`, \`${column}\` FROM \`${database}\`.\`${table}\` ORDER BY \`${pkColumn}\` DESC LIMIT 10`;

  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection({
      host: tunnel.host,
      port: tunnel.port,
      user: tunnel.dbUser,
      connectTimeout: 10_000,
    });

    await connection.query('SET SESSION MAX_EXECUTION_TIME = 5000');
    await connection.query('SET TRANSACTION READ ONLY');
    await connection.query('START TRANSACTION');

    const [rows] = await connection.query<mysql.RowDataPacket[]>(sql);

    await connection.query('COMMIT');

    const resultRows: Array<[unknown, unknown]> = rows.map((row) => [
      row[pkColumn] ?? null,
      row[column] ?? null,
    ]);

    return { sql, columns: [pkColumn, column], rows: resultRows };
  } finally {
    if (connection) {
      try { await connection.end(); } catch { /* ignore */ }
    }
    if (ownsTunnel && tunnel) {
      unregisterTunnel(tunnel.dbName);
      try {
        const tsh = await findTsh();
        await stopTunnel(tsh, tunnel);
      } catch { /* ignore */ }
    }
  }
}
