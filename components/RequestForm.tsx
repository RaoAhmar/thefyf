"use client";

import { useState } from "react";

export default function RequestForm({ mentorSlug }: { mentorSlug: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/session-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentorSlug, name, email, preferredTime, message }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setStatus("success");
        setName("");
        setEmail("");
        setPreferredTime("");
        setMessage("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
      <input
        className="rounded-lg border p-2 bg-black text-white"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        className="rounded-lg border p-2 bg-black text-white"
        placeholder="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="rounded-lg border p-2 md:col-span-2 bg-black text-white"
        placeholder="Preferred time (e.g., Sat 6–8pm PKT)"
        value={preferredTime}
        onChange={(e) => setPreferredTime(e.target.value)}
      />
      <textarea
        className="rounded-lg border p-2 md:col-span-2 bg-black text-white"
        rows={4}
        placeholder="What do you want help with?"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className={`mt-2 inline-flex items-center justify-center rounded-full border px-4 py-2 transition ${
          status === "loading" ? "opacity-60" : "hover:shadow"
        }`}
      >
        {status === "loading" ? "Submitting…" : "Submit"}
      </button>

      {status === "success" && (
        <div className="md:col-span-2 text-sm text-green-400 transition-opacity">
          Request sent! We’ll email you after the mentor responds.
        </div>
      )}
      {status === "error" && (
        <div className="md:col-span-2 text-sm text-red-400">
          Something went wrong. Please try again.
        </div>
      )}
    </form>
  );
}
