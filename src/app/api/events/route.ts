import { NextRequest, NextResponse } from "next/server";
import { DEMO_USER_ID, supabaseServer } from "@/lib/supabaseServer";
import {
  eventFromDb,
  eventTargetFromDb,
  eventTargetToDb,
  eventToDb,
} from "@/lib/dbMappers";
import { EventRecord, EventTarget } from "@/lib/types";

const EVENT_TYPES = new Set([
  "sales_meeting",
  "investor_meeting",
  "partnership_meeting",
  "vendor_negotiation",
  "customer_call",
  "startup_event",
  "conference",
  "other",
  "startup_expo",
  "hackathon",
]);

function validateEvent(event: EventRecord | undefined): string | null {
  if (!event || !event.eventName?.trim()) return "A meeting or event name is required.";
  if (!EVENT_TYPES.has(event.eventType)) return "Unsupported interaction type.";
  if (!event.eventStart) return "A start date and time are required.";
  if (!event.userGoal?.trim()) return "A desired outcome is required.";
  if (!Array.isArray(event.targets)) return "Targets must be an array.";
  return null;
}

async function replaceTargets(eventId: string, targets: EventTarget[]) {
  const { error: deleteError } = await supabaseServer
    .from("event_targets")
    .delete()
    .eq("user_id", DEMO_USER_ID)
    .eq("event_id", eventId);
  if (deleteError) throw deleteError;

  if (targets.length === 0) return [];
  const { data, error } = await supabaseServer
    .from("event_targets")
    .insert(
      targets.map((target) => ({
        user_id: DEMO_USER_ID,
        event_id: eventId,
        ...eventTargetToDb(target),
      }))
    )
    .select("*");
  if (error) throw error;
  return (data ?? []).map(eventTargetFromDb);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const event: EventRecord | undefined = body?.event;
  const validationError = validateEvent(event);
  if (validationError || !event) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const { data: row, error } = await supabaseServer
      .from("events")
      .insert({ user_id: DEMO_USER_ID, ...eventToDb(event) })
      .select("*")
      .single();
    if (error) throw error;

    try {
      const targets = await replaceTargets(row.id, event.targets);
      return NextResponse.json({
        event: eventFromDb(row, targets, event.audienceSegmentId),
      });
    } catch (targetError) {
      await supabaseServer
        .from("events")
        .delete()
        .eq("id", row.id)
        .eq("user_id", DEMO_USER_ID);
      throw targetError;
    }
  } catch (error) {
    console.error("create event failed:", error);
    return NextResponse.json({ error: "Failed to save the interaction." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const event: EventRecord | undefined = body?.event;
  const validationError = validateEvent(event);
  if (validationError || !event?.id) {
    return NextResponse.json({ error: validationError ?? "Missing event.id." }, { status: 400 });
  }

  try {
    const { data: row, error } = await supabaseServer
      .from("events")
      .update({ ...eventToDb(event), updated_at: new Date().toISOString() })
      .eq("id", event.id)
      .eq("user_id", DEMO_USER_ID)
      .select("*")
      .single();
    if (error) throw error;
    const targets = await replaceTargets(row.id, event.targets);
    return NextResponse.json({
      event: eventFromDb(row, targets, event.audienceSegmentId),
    });
  } catch (error) {
    console.error("update event failed:", error);
    return NextResponse.json({ error: "Failed to update the interaction." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id: string | undefined = body?.id;
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  try {
    const { error } = await supabaseServer
      .from("events")
      .delete()
      .eq("id", id)
      .eq("user_id", DEMO_USER_ID);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("delete event failed:", error);
    return NextResponse.json({ error: "Failed to delete the interaction." }, { status: 500 });
  }
}
