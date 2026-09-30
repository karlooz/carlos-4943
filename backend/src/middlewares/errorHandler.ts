import type { ErrorRequestHandler, RequestHandler } from 'express';

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
}

/** Errores conocidos del parser JSON de Express, traducidos a respuestas claras. */
const BODY_PARSER_ERRORS: Record<string, { status: number; error: string; message: string }> = {
  'entity.parse.failed': {
    status: 400,
    error: 'invalid_json',
    message: 'El cuerpo de la petición no es JSON válido.',
  },
  'entity.too.large': {
    status: 413,
    error: 'payload_too_large',
    message: 'El cuerpo de la petición es demasiado grande.',
  },
};

export const notFoundHandler: RequestHandler = (req, res) => {
  const message = `Ruta no encontrada: ${req.method} ${req.path}`;
  res.status(404).json({ error: 'not_found', message });
};

/**
 * Manejador central de errores. Nunca expone el stack ni el cuerpo de la petición
 * (podría contener datos de tarjeta) en la respuesta ni en los logs.
 */
export const errorHandler: ErrorRequestHandler = (error: HttpError, _req, res, _next) => {
  const known = error.type ? BODY_PARSER_ERRORS[error.type] : undefined;
  if (known) {
    res.status(known.status).json({ error: known.error, message: known.message });
    return;
  }

  const status = error.status ?? error.statusCode ?? 500;
  const isServerError = status >= 500;
  if (isServerError) {
    console.error(`[error] ${error.name}: ${error.message}`);
  }

  res.status(status).json({
    error: isServerError ? 'internal_error' : 'request_error',
    message: isServerError ? 'Ocurrió un error inesperado.' : error.message,
  });
};
