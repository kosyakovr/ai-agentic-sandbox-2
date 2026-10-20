/**
 * posts module, ring 4 (HTTP): GET /posts. The only file of the module that imports fastify.
 */
import { ProblemDetails } from '@blog/contracts/errors';
import { PostsListQuery, PostsListResponse } from '@blog/contracts/posts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { LIST_CACHE_CONTROL } from './constants.js';
import { toPostsListResponse } from './helpers.js';

const postsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/posts',
    {
      schema: {
        querystring: PostsListQuery,
        response: { 200: PostsListResponse, 400: ProblemDetails, 500: ProblemDetails, 503: ProblemDetails },
      },
    },
    async (request, reply) => {
      const { page, pageSize } = request.query;
      const { posts, total } = await app.container.postsRepository.listPublished({
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      reply.header('cache-control', LIST_CACHE_CONTROL);
      return toPostsListResponse(posts, total, page, pageSize);
    },
  );
};

export default postsRoutes;
