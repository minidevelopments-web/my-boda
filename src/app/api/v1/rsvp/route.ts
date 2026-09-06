import { NextRequest, NextResponse } from "next/server";
import { rsvpSchema } from "@/lib/validators";
import { rsvpService } from "@/lib/services/rsvpService";
import { getDictionary, pickLocale } from "@/lib/i18n";

export async function POST(req: NextRequest) {
  const locale = pickLocale(req.headers.get("accept-language"), null);
  const api = getDictionary(locale).rsvp.api;
  try {
    const body = await req.json();
    const parsed = rsvpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const result = await rsvpService.submitRsvp(parsed.data);

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "Guest not found") {
      return NextResponse.json({ error: api.guestNotFound }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: api.internalError }, { status: 500 });
  }
}
