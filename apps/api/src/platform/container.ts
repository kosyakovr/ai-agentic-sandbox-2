/**
 * Composition root: builds the database and the repositories once.
 */
import { createDatabase } from '../db/client.js';
import { PostsRepository } from '../modules/posts/repository.js';
import type { AppConfig } from './config.js';

export interface Container {
  postsRepository: PostsRepository;
  close(): Promise<void>;
}

export function createContainer(
  config: AppConfig,
  logger: { error(obj: object, msg: string): void },
): Container {
  const { db, close } = createDatabase(config.databaseUrl, (err) => logger.error({ err }, 'pg pool error'));
  return { postsRepository: new PostsRepository(db), close };
}
