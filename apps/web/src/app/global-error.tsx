"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#0f0a1e",
          color: "#e2e8f0",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            textAlign: "center",
            padding: "2rem",
          }}
        >
          <p style={{ fontSize: "5rem", lineHeight: 1, margin: 0 }}>⚠️</p>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#94a3b8", maxWidth: "30rem", margin: 0 }}>
            An unexpected error occurred. Please try again.
          </p>
          {error?.digest && (
            <p style={{ color: "#64748b", fontSize: "0.75rem" }}>Error ID: {error.digest}</p>
          )}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              onClick={reset}
              style={{
                padding: "0.625rem 1.5rem",
                background: "linear-gradient(135deg, #7c3aed, #2563eb)",
                color: "#fff",
                border: "none",
                borderRadius: "0.75rem",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <Link
              href="/"
              style={{
                padding: "0.625rem 1.5rem",
                background: "rgba(255,255,255,0.08)",
                color: "#e2e8f0",
                borderRadius: "0.75rem",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "0.875rem",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              ← Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
