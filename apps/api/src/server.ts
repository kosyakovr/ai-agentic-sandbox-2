/**
 * Process entry: load config, build the app, listen, shut down on SIGINT/SIGTERM.
 */
import { buildApp } from './app.js';
import { loadConfig, type AppConfig } from './platform/config.js';

let config: AppConfig | undefined;
try {
  config = loadConfig();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Invalid environment');
  process.exitCode = 1;
}

if (config) {
  const app = await buildApp(config);
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void app.close();
    });
  }
  await app.listen({ host: config.host, port: config.port });
}
