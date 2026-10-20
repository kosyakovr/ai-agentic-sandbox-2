/**
 * Not a test (the name does not match *.test.ts). A child process for errors.it.test.ts: it builds the app with the
 * real logger turned on, sends four requests and exits, so the test can read the log lines the app wrote to stdout.
 *
 * usage: node --import tsx test/errors-log-probe.ts <database url>
 */
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';

const databaseUrl = process.argv[2];
if (!databaseUrl) throw new Error('usage: errors-log-probe.ts <database url>');

const app = await buildApp(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'info', DATABASE_URL: databaseUrl }), { logger: true });
app.get('/boom', async () => {
  throw new Error('internal detail: select * from users where password = hunter2');
});

await app.inject({ method: 'GET', url: '/nope?token=secret-token' });
await app.inject({ method: 'GET', url: '/posts?page=2' });
await app.inject({ method: 'GET', url: '/boom' });
await app.inject({ method: 'DELETE', url: '/gone' });
await app.close();
