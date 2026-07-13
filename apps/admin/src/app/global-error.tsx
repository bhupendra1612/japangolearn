"use client";

import { useEffect } from "react";
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
          background: "#0f172a",
          color: "#e2e8f0",
        }}
      >
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: 0 }}>Admin panel error</h1>
          <p style={{ color: "#94a3b8", maxWidth: "30rem", margin: 0 }}>
            Something failed while loading the admin panel.
          </p>
          {error?.digest && (
            <p style={{ color: "#64748b", fontSize: "0.75rem" }}>Error ID: {error.digest}</p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "1rem",
              padding: "0.625rem 1.5rem",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
