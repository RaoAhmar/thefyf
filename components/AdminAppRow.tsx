"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type AdminAppRowData = {
  id: string;
  created_at: string;
  display_name: string | null;
  user_id: string;
  headline: string | null;
  rate: number | null;
  tags: string[] | null;
  status: string;
};

type Props = {
  app: AdminAppRowData;
};

export default function AdminAppRow({ app }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  function goDetail() {
    router.push(`/admin/apps/${app.id}`);
  }

  async function setStatus(action: "approve" | "decline" | "suspend" | "block") {
    try {
      setBusy(action);
      const res = await fetch(`/api/admin/apps/${app.id}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        console.error(await res.text());
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  // Prevent row navigation when clicking action buttons/links
  function stop<E extends React.SyntheticEvent>(e: E) {
    e.stopPropagation();
    e.preventDefault();
  }

  return (
    <tr
      className="relative cursor-pointer hover:bg-white/5"
      onClick={goDetail}
      title="Click to review"
    >
      <td className="whitespace-nowrap px-3 py-3 text-sm opacity-80">
        {new Date(app.created_at).toLocaleString()}
      </td>

      <td className="px-3 py-3">
        <div className="flex flex-col">
          <span className="font-medium">{app.display_name || "—"}</span>
          <span className="text-xs opacity-60">{app.user_id}</span>
        </div>
      </td>

      <td className="px-3 py-3">{app.headline || "—"}</td>

      <td className="whitespace-nowrap px-3 py-3">
        {app.rate ? `PKR ${app.rate.toLocaleString()}/hr` : "—"}
      </td>

      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1">
          {(app.tags ?? []).map((t, i) => (
            <span key={i} className="rounded-full border px-2 py-0.5 text-xs opacity-80">
              {t}
            </span>
          ))}
          {(!app.tags || app.tags.length === 0) && <span className="opacity-60">—</span>}
        </div>
      </td>

      <td className="whitespace-nowrap px-3 py-3 text-sm capitalize opacity-80">
        {app.status}
      </td>

      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={(e) => { stop(e); setStatus("approve"); }}
            disabled={busy !== null}
            className="rounded-full border px-3 py-1 text-sm hover:shadow disabled:opacity-50"
          >
            {busy === "approve" ? "…" : "Approve"}
          </button>
          <button
            onClick={(e) => { stop(e); setStatus("decline"); }}
            disabled={busy !== null}
            className="rounded-full border px-3 py-1 text-sm hover:shadow disabled:opacity-50"
          >
            {busy === "decline" ? "…" : "Decline"}
          </button>
        </div>
      </td>
    </tr>
  );
}
