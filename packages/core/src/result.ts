export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export type AppError = {
  code: AppErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T = never>(error: AppError): Result<T> {
  return { ok: false, error };
}

export function errorFromUnknown(
  error: unknown,
  fallbackCode: AppErrorCode = "INTERNAL_ERROR"
): AppError {
  if (error instanceof Error) {
    return { code: fallbackCode, message: error.message };
  }

  return { code: fallbackCode, message: "Unexpected application error" };
}
