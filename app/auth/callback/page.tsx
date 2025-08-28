// OAuth callback page (no `any`).
// Reads URL params like ?code=...&error=... and shows a simple state.
// If you need to exchange the code, do it in a server action or effect without using `any`.

type SearchParams = Record<string, string | string[] | undefined>;

function asSingle(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function OAuthCallbackPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const code = asSingle(searchParams.code);
  const error = asSingle(searchParams.error);
  const state = asSingle(searchParams.state);

  const hasError = typeof error === "string" && error.length > 0;
  const hasCode = typeof code === "string" && code.length > 0;

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
        Authentication Callback
      </h1>

      {hasError && (
        <p style={{ color: "#b91c1c", marginBottom: 12 }}>
          Error: <strong>{error}</strong>
        </p>
      )}

      {!hasError && hasCode && (
        <p style={{ marginBottom: 12 }}>
          Success! Received authorization <strong>code</strong>.
        </p>
      )}

      {!hasError && !hasCode && (
        <p style={{ marginBottom: 12 }}>
          No code present. If you were redirected here unexpectedly, try
          starting the sign-in again.
        </p>
      )}

      {state && (
        <p style={{ fontSize: 12, color: "#6b7280" }}>
          State: <code>{state}</code>
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <a
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
        </a>
      </div>
    </main>
  );
}
