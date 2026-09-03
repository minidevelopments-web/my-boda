import { NextRequest, NextResponse } from "next/server";
import { rsvpSchema } from "@/lib/validators";
import { rsvpService } from "@/lib/services/rsvpService";

export async function POST(req: NextRequest) {
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
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
