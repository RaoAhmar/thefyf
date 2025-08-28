// API: create a mentor session/request (no `any`).
// Validates the JSON body and returns 400 on invalid input.
// Replace the "TODO: persist..." section with your actual DB insert.

import { NextRequest, NextResponse } from "next/server";

export type SessionRequestBody = {
  mentorId: string;        // required
  note?: string;           // optional initial message
  proposedRate?: number;   // optional PKR/hour
};

function isSessionRequestBody(value: unknown): value is SessionRequestBody {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.mentorId !== "string" || v.mentorId.trim() === "") return false;
  if ("note" in v && typeof v.note !== "string") return false;
  if ("proposedRate" in v && typeof v.proposedRate !== "number") return false;
  return true;
}

export async function POST(req: NextRequest) {
  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isSessionRequestBody(data)) {
    return NextResponse.json(
      {
        error:
          "Invalid body. Expected { mentorId: string, note?: string, proposedRate?: number }",
      },
      { status: 400 }
    );
  }

  const body = data; // typed as SessionRequestBody thanks to the type guard

  // TODO: persist to your DB here (create a "connection/request" row, etc.)
  // Example response shape (adjust to your domain):
  const response = {
    ok: true,
    request: {
      mentorId: body.mentorId,
      note: body.note ?? null,
      proposedRate: typeof body.proposedRate === "number" ? body.proposedRate : null,
      createdAt: new Date().toISOString(),
    },
  };

  return NextResponse.json(response, { status: 201 });
}
