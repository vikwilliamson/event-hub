/**
 * Structured app error for consistent handling. Server Actions catch and
 * return { ok: false, error: normalizeError(err).message }.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 500,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function normalizeError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Error) {
    return new AppError(err.message, "UNKNOWN", 500);
  }
  return new AppError("An unexpected error occurred", "UNKNOWN", 500);
}
