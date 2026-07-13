import Link from "next/link";

export default function NotFound() {
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
          <p style={{ fontSize: "5rem", lineHeight: 1, margin: 0 }}>🌸</p>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: 0 }}>404 — Page Not Found</h1>
          <p style={{ color: "#94a3b8", maxWidth: "30rem", margin: 0 }}>
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Link
            href="/"
            style={{
              marginTop: "1rem",
              padding: "0.625rem 1.5rem",
              background: "linear-gradient(135deg, #7c3aed, #2563eb)",
              color: "#fff",
              borderRadius: "0.75rem",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
          >
            ← Back to Home
          </Link>
        </div>
      </body>
    </html>
  );
}
