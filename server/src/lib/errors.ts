/** An error with an HTTP status code and a stable machine-readable code. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, 'bad_request', message, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new AppError(401, 'unauthorized', message);
  }
  static forbidden(message = 'Not allowed') {
    return new AppError(403, 'forbidden', message);
  }
  static notFound(message = 'Not found') {
    return new AppError(404, 'not_found', message);
  }
  static conflict(message: string) {
    return new AppError(409, 'conflict', message);
  }
  static tooManyRequests(message = 'Too many requests, slow down') {
    return new AppError(429, 'rate_limited', message);
  }
  static internal(message = 'Something went wrong on our side') {
    return new AppError(500, 'internal_error', message);
  }
}
