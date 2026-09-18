import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/requireAdmin";
import { guestService } from "@/lib/services/guestService";

const CSV_HEADERS = [
  "id",
  "name",
  "email",
  "category",
  "plusOne",
  "plusOneName",
  "attending",
  "headcount",
  "mealChoice",
  "dietaryNotes",
  "message",
  "respondedAt",
  "createdAt",
] as const;

function escapeCsvValue(value: unknown): string {
  const str = String(value ?? "");
  // Escape quotes by doubling them, wrap in quotes if contains comma, quote, or newline
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function guestToCsvRow(g: {
  id: string;
  name: string;
  email: string | null;
  category: string;
  plusOne: boolean;
  plusOneName: string | null;
  rsvp: { attending: boolean; headcount: number; mealChoice: string | null; dietaryNotes: string | null; message: string | null; respondedAt: Date } | null;
  createdAt: Date;
}): string {
  const fields = [
    g.id,
    g.name,
    g.email || "",
    g.category,
    g.plusOne ? "yes" : "no",
    g.plusOneName || "",
    g.rsvp?.attending ? "yes" : g.rsvp ? "no" : "",
    g.rsvp?.headcount ?? "",
    g.rsvp?.mealChoice || "",
    g.rsvp?.dietaryNotes || "",
    g.rsvp?.message || "",
    g.rsvp?.respondedAt?.toISOString() || "",
    g.createdAt.toISOString(),
  ];
  return fields.map(escapeCsvValue).join(",");
}

export async function GET(req: NextRequest) {
  const guard = requireRole(req, "COUPLE", "PLANNER", "SYSADMIN");
  if (guard) return guard;

  // Optional ?limit guard for export — caps total rows streamed (defense against accidental huge exports).
  // If omitted, streams entire table in batches via cursor pagination (no full-table load → no OOM).
  const { searchParams } = new URL(req.url);
  const rawLimit = searchParams.get("limit");
  let exportLimit: number | undefined;
  if (rawLimit !== null) {
    const parsed = Number(rawLimit);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return NextResponse.json({ error: "Invalid limit: must be positive integer" }, { status: 400 });
    }
    exportLimit = Math.min(parsed, 10000);
  }

  try {
    const encoder = new TextEncoder();
    let streamedCount = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(CSV_HEADERS.map(escapeCsvValue).join(",") + "\n"));

          for await (const batch of guestService.streamGuestsForExport(500)) {
            for (const guest of batch) {
              if (exportLimit !== undefined && streamedCount >= exportLimit) break;
              controller.enqueue(encoder.encode(guestToCsvRow(guest as unknown as Parameters<typeof guestToCsvRow>[0]) + "\n"));
              streamedCount++;
            }
            if (exportLimit !== undefined && streamedCount >= exportLimit) break;
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="guests.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
