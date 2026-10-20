/**
 * `pnpm --filter @blog/api db:seed`: loads the config, seeds, prints the counts.
 */
import { loadConfig } from '../../platform/config.js';
import { runSeed } from './run.js';

try {
  const config = loadConfig();
  const counts = await runSeed({ databaseUrl: config.databaseUrl, nodeEnv: config.nodeEnv });
  const total = counts.published + counts.draft + counts.scheduled;
  console.log(`Seeded ${total} posts (${counts.published} published, ${counts.draft} draft, ${counts.scheduled} scheduled)`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
