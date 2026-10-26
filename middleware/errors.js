class ApiError extends Error {
  constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details; }
}
const E = {
  badRequest: (m = 'Invalid request.', d) => new ApiError(400, 'BAD_REQUEST', m, d),
  unauthorized: (m = 'Please sign in to continue.') => new ApiError(401, 'UNAUTHORIZED', m),
  forbidden: (m = 'You do not have permission to do this.') => new ApiError(403, 'FORBIDDEN', m),
  notFound: (m = 'Not found.') => new ApiError(404, 'NOT_FOUND', m),
  conflict: (m, d, code = 'CONFLICT') => new ApiError(409, code, m, d),
  tooMany: (m = 'Too many requests. Please try again shortly.') => new ApiError(429, 'RATE_LIMITED', m),
};

// Centralised: never leak stack traces or raw MongoDB errors to the client.
function toResponse(err) {
  if (err instanceof ApiError) {
    return { status: err.status, body: { success: false, error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } } };
  }
  if (err && err.name === 'ZodError') {
    const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return { status: 400, body: { success: false, error: { code: 'VALIDATION_ERROR', message: 'Please check the highlighted fields.', details } } };
  }
  if (err && err.code === 11000) {
    return { status: 409, body: { success: false, error: { code: 'DUPLICATE', message: 'A record with the same value already exists.' } } };
  }
  if (err && (err.name === 'CastError' || err.name === 'ValidationError')) {
    return { status: 400, body: { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid request.' } } };
  }
  console.error('[api error]', err); // technical detail stays server-side
  return { status: 500, body: { success: false, error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' } } };
}
module.exports = { ApiError, E, toResponse };
