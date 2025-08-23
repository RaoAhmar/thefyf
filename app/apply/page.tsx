// ...top of file stays the same

export default function ApplyPage() {
  // ...existing state

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<null | { id: string }>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ...all existing effects and helpers

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      // session
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Please sign in to submit.");

      // 1) Optional: upload photo via signed URL
      let photoUrl: string | undefined;
      if (photoFile) {
        // ask server for signed upload ticket
        const signRes = await fetch("/api/upload/mentor-photo", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            filename: photoFile.name,
            contentType: photoFile.type || "image/jpeg",
          }),
        });
        const signJson = await signRes.json();
        if (!signRes.ok || !signJson?.ok) throw new Error("Could not start photo upload.");

        // upload to signed URL using supabase-js helper
        const upRes = await supabaseBrowser.storage
          .from("mentor-photos")
          .uploadToSignedUrl(signJson.path, signJson.token, photoFile);

        if (upRes.error) throw new Error("Photo upload failed. Try a smaller image.");

        // get a public URL to store
        const { data: pub } = supabaseBrowser.storage.from("mentor-photos").getPublicUrl(signJson.path);
        photoUrl = pub.publicUrl;
      }

      // 2) POST application to server (server will resolve tag IDs to names)
      const saveRes = await fetch("/api/apply", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first,
          last,
          headline,
          bio,
          linkedin,
          portfolio: portfolio || null,
          country,
          city,
          photoUrl: photoUrl || null,
          rate: Number(rate || "0"),
          roles,
          tagIds: selectedTags, // IDs; server converts to names
        }),
      });
      const saveJson = await saveRes.json();
      if (!saveRes.ok || !saveJson?.ok) {
        throw new Error("Failed to submit. Please try again.");
      }

      setSubmitted({ id: saveJson.id });
      // Optionally clear form
      // ...
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // replace the <form ...> opening tag to include onSubmit
  // <form className="mt-8 grid gap-6">  -> becomes:
  // <form className="mt-8 grid gap-6" onSubmit={handleSubmit}>

  // ...then replace the "Actions" block with this:
  /*
  <div className="flex items-center gap-3">
    <button
      type="submit"
      disabled={submitting}
      className="rounded-full border px-4 py-2 hover:shadow disabled:opacity-60"
    >
      {submitting ? "Submitting…" : "Submit application"}
    </button>
    <Link href="/" className="rounded-full border px-4 py-2 hover:shadow">
      Go Home
    </Link>
  </div>

  {errorMsg && (
    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">
      {errorMsg}
    </div>
  )}

  {submitted && (
    <div className="rounded-2xl border px-4 py-3">
      Application submitted! We’ll review it shortly.
      <div className="mt-2 text-sm opacity-80">
        You can check your status on your{" "}
        <Link href="/mentor" className="underline">
          Mentor Dashboard
        </Link>.
      </div>
    </div>
  )}
  */
