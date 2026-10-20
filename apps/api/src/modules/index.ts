/**
 * Registry of the route plugins registered by `app.ts`. Imports no fastify.
 */
import postsRoutes from './posts/routes.js';

export const modules = [postsRoutes];
