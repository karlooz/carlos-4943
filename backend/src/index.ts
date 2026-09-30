import { existsSync } from 'node:fs';
import { createApp } from './app.js';
import { loadConfig } from './config/env.js';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const config = loadConfig();
const app = createApp({ config });

const server = app.listen(config.port, () => {
  console.info(`[server] API escuchando en http://localhost:${config.port}`);
  if (config.snailPay.simulateOutage) {
    console.warn('[server] SnailPay en modo "caída simulada": todas las recargas responderán 503.');
  }
});

const shutdown = (signal: NodeJS.Signals): void => {
  console.info(`[server] ${signal} recibido, cerrando servidor...`);
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
