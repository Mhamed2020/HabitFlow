import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

export type ErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Resource') => new ApiError(404, 'NOT_FOUND', `${what} not found`);
export const validation = (message: string) => new ApiError(400, 'VALIDATION_ERROR', message);

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(notFound(`Route ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
  } else if (err instanceof ZodError) {
    const message = err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message } });
  } else if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } });
  } else {
    console.error(err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  }
};
