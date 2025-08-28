"use client";

/**
 * Fixes Next.js 15 error:
 * "useSearchParams() should be wrapped in a suspense boundary at page '/auth'"
 * by wrapping the hook usage in <Suspense>.
 * Also avoids server page typing (searchParams: Promise<...>) by using a Client Component.
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function AuthContent() {
  const sp = useSearchParams();
  const mode = sp.get("mode") ?? "sign-in"; // example: ?mode=sign-up
  const error = sp.get("error") ?? "";
  const message = sp.get("message") ?? "";

  return (
    <main
      style={{
        maxWidth: 520,
        margin: "48px auto",
        padding: 16,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        fontFamily:
          "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,Apple Color Emoji,Segoe UI Emoji",
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
        {mode === "sign-up" ? "Create your account" : "Sign in"}
      </h1>

      {error && (
        <p style={{ color: "#b91c1c", marginBottom: 12 }}>
          Error: <strong>{error}</strong>
        </p>
      )}

      {message && (
        <p style={{ color: "#065f46", marginBottom: 12 }}>
          {message}
        </p>
      )}

      {/* Replace this block with your actual auth UI */}
      <div
        style={{
          padding: 12,
          border: "1px dashed #cbd5e1",
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        Auth form goes here (mode: <code>{mode}</code>)
      </div>

      <div style={{ marginTop: 16 }}>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #0F6EFD",
            color: "#0F6EFD",
            textDecoration: "none",
          }}
        >
          Go to Home
        </Link>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main style={{ maxWidth: 520, margin: "48px auto", padding: 16 }}>
          Loading…
        </main>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
