import type { ErrorRequestHandler } from 'express';
import { ScriptValidationError } from './validateScript.js';

// Central JSON error handler. Sets the right status + a stable shape so the
// frontend can branch on `error` codes without parsing English strings.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ScriptValidationError) {
    res.status(err.status).json({ error: 'invalid_script', issues: err.issues });
    return;
  }
  console.error('[api] unhandled error:', err);
  const message = err instanceof Error ? err.message : String(err);
  res.status(500).json({ error: 'internal_error', message });
};
