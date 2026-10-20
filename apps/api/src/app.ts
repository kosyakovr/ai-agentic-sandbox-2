/**
 * Ring 4 (composition): builds the Fastify instance. Order matters: parsers, container, security headers,
 * logging, error handler, not-found handler, modules.
 */
import { randomUUID } from 'node:crypto';
import helmet from '@fastify/helmet';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { modules } from './modules/index.js';
import type { AppConfig } from './platform/config.js';
import { createContainer, type Container } from './platform/container.js';
import { AppError, toProblem } from './platform/errors.js';

declare module 'fastify' {
  interface FastifyInstance {
    container: Container;
  }
}

const DETAILS: Record<number, [title: string, detail: string]> = {
  400: ['Bad request', 'The request is invalid.'],
  404: ['Not found', 'The requested resource was not found.'],
  500: ['Internal server error', 'An unexpected error occurred.'],
  503: ['Service unavailable', 'The service is temporarily unavailable.'],
};

function genericProblem(status: number) {
  const [title, detail] = DETAILS[status] ?? (status >= 500 ? DETAILS[500]! : ['Bad request', 'The request could not be processed.']);
  return toProblem(status, title, detail);
}

export async function buildApp(config: AppConfig, options: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      options.logger === false
        ? false
        : {
            level: config.logLevel,
            ...(config.nodeEnv === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
          },
    disableRequestLogging: true,
    genReqId: () => randomUUID(),
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const container = createContainer(config, app.log);
  app.decorate('container', container);
  app.addHook('onClose', async () => {
    await container.close();
  });

  await app.register(helmet);

  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        reqId: request.id,
        method: request.method,
        path: request.url.split('?')[0],
        statusCode: reply.statusCode,
        durationMs: reply.elapsedTime,
      },
      'request completed',
    );
  });

  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    let problem;
    if (hasZodFastifySchemaValidationErrors(error)) {
      const [title, detail] = DETAILS[400]!;
      problem = toProblem(
        400,
        title,
        detail,
        error.validation.map((issue) => ({
          param: issue.instancePath.slice(1).split('/')[0] ?? '',
          message: issue.message ?? 'Invalid value',
        })),
      );
    } else if (error instanceof AppError) {
      problem = toProblem(error.status, error.title, error.detail);
    } else if (isResponseSerializationError(error)) {
      problem = genericProblem(500);
    } else {
      const status = (error as FastifyError).statusCode;
      problem = status && status >= 400 && status < 500 ? genericProblem(status) : genericProblem(500);
    }
    if (problem.status >= 500) request.log.error({ err: error }, 'request failed');
    return reply
      .code(problem.status)
      .type('application/problem+json')
      .header('cache-control', 'no-store')
      .send(problem);
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).type('application/problem+json').header('cache-control', 'no-store').send(genericProblem(404)),
  );

  for (const plugin of modules) await app.register(plugin);

  return app;
}
