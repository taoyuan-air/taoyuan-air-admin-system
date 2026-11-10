import type { ErrorRequestHandler, RequestHandler } from 'express';

// Express 4 does not automatically forward rejected route promises.
export function asyncRoute(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export const apiErrorHandler: ErrorRequestHandler = (_error, _req, res, _next) => {
  if (res.headersSent) {
    res.end();
    return;
  }
  res.status(500).json({ error: 'INTERNAL_ERROR', message: '服務暫時無法處理請求' });
};
