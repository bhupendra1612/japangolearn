import { err, ok, type Result } from "@japangolearn/core";
import type { PostgrestError } from "@supabase/supabase-js";

export function fromPostgrest<T>(
  data: T | null,
  error: PostgrestError | null,
  notFoundMessage?: string
): Result<T> {
  if (error) {
    return err({
      code: error.code === "PGRST116" ? "NOT_FOUND" : "DATABASE_ERROR",
      message: error.message,
      details: { code: error.code, hint: error.hint },
    });
  }

  if (data === null) {
    return err({
      code: "NOT_FOUND",
      message: notFoundMessage ?? "Requested record was not found.",
    });
  }

  return ok(data);
}
