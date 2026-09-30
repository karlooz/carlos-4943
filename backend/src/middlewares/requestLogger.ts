import type { RequestHandler } from 'express';

/** Log mínimo de acceso: método, ruta, estado y duración. No registra cuerpos ni headers. */
export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = performance.now();

  res.on('finish', () => {
    const durationMs = Math.round(performance.now() - startedAt);
    console.info(`[http] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs} ms)`);
  });

  next();
};
