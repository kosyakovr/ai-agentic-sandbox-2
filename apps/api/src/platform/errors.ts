/**
 * Cross-cutting: application errors and the problem+json body shape. Pure; imports no framework,
 * so repositories may throw these.
 */
import type { ProblemDetails } from '@blog/contracts/errors';

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    readonly detail: string,
    options?: { cause?: unknown },
  ) {
    super(title, options);
    this.name = 'AppError';
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(options?: { cause?: unknown }) {
    super(503, 'Service unavailable', 'The service is temporarily unavailable.', options);
    this.name = 'ServiceUnavailableError';
  }
}

export function toProblem(
  status: number,
  title: string,
  detail: string,
  errors?: Array<{ param: string; message: string }>,
): ProblemDetails {
  return { type: 'about:blank', title, status, detail, ...(errors ? { errors } : {}) };
}
