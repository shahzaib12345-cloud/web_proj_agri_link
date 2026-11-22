/** Error carrying an HTTP status and the stable machine-readable code the frontend translates. */
export class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export const createError = (status, code) => new HttpError(status, code);

export function notFoundHandler(_req, _res, next) {
  next(createError(404, 'not_found'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.status || err.statusCode || 500;
  let code = err.code;

  if (!(err instanceof HttpError)) {
    // Normalise known library errors; never leak their messages.
    if (err.type === 'entity.parse.failed') [status, code] = [400, 'invalid_body'];
    else if (err.type === 'entity.too.large') [status, code] = [413, 'payload_too_large'];
    else if (err.name === 'CastError') [status, code] = [400, 'invalid_body'];
    else if (err.name === 'ValidationError') [status, code] = [400, 'invalid_body'];
    else if (err.code === 11000) [status, code] = [409, err.keyPattern?.phone ? 'phone_taken' : 'conflict'];
    else if (!(status >= 400 && status < 500)) [status, code] = [500, 'generic'];
    else code = `http_${status}`;
  }

  if (status >= 500) console.error('Unhandled server error:', err);
  return res.status(status).json({ code: code || 'generic' });
}
