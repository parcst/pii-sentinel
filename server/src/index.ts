import express from 'express';
import cors from 'cors';
import filesystemRouter from './routes/filesystem.js';
import scanRouter from './routes/scan.js';
import exportRouter from './routes/export.js';
import teleportRouter from './routes/teleport.js';
import settingsRouter from './routes/settings.js';
import exclusionsRouter from './routes/exclusions.js';
import { cleanupAll } from './services/teleport.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api', filesystemRouter);
app.use('/api/scan', scanRouter);
app.use('/api/export', exportRouter);
app.use('/api/teleport', teleportRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/exclusions', exclusionsRouter);

app.listen(PORT, () => {
  console.log(`PII Sentinel server running on http://localhost:${PORT}`);
});

// Cleanup tunnels on process termination
async function shutdown(signal: string) {
  console.log(`\n[${signal}] Cleaning up tunnels...`);
  await cleanupAll();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
