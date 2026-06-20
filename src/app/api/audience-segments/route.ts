import { NextRequest, NextResponse } from "next/server";
import { DEMO_USER_ID, supabaseServer } from "@/lib/supabaseServer";
import { audienceSegmentFromDb } from "@/lib/dbMappers";
import { AudienceSegment } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Replaces the entire audience-segment list for the demo user in one
// call: existing rows (real DB UUIDs) are updated, client-generated
// temp ids (e.g. "aud-172...") are inserted as new rows, and any DB
// row not present in the submitted list is deleted. This matches the
// UI's "always pass the full array" editing model without risking
// duplicate inserts on every keystroke.
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const segments: AudienceSegment[] | undefined = body?.segments;
  if (!segments) {
    return NextResponse.json({ error: "Missing 'segments' in body." }, { status: 400 });
  }

  try {
    const { data: existingRows, error: existingError } = await supabaseServer
      .from("audience_segments")
      .select("id")
      .eq("user_id", DEMO_USER_ID);
    if (existingError) throw existingError;

    const existingIds = new Set((existingRows ?? []).map((r) => r.id));
    const submittedRealIds = new Set(
      segments.filter((s) => UUID_RE.test(s.id)).map((s) => s.id)
    );

    const idsToDelete = [...existingIds].filter((id) => !submittedRealIds.has(id));
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabaseServer
        .from("audience_segments")
        .delete()
        .eq("user_id", DEMO_USER_ID)
        .in("id", idsToDelete);
      if (deleteError) throw deleteError;
    }

    const result: AudienceSegment[] = [];
    for (const s of segments) {
      const payload = {
        user_id: DEMO_USER_ID,
        name: s.name,
        roles: s.roles,
        company_types: s.companyTypes,
        problems: s.problems,
        needs: s.needs,
        objections: s.objections,
        desired_outcomes: s.desiredOutcomes,
        updated_at: new Date().toISOString(),
      };

      if (UUID_RE.test(s.id) && existingIds.has(s.id)) {
        const { data, error } = await supabaseServer
          .from("audience_segments")
          .update(payload)
          .eq("id", s.id)
          .eq("user_id", DEMO_USER_ID)
          .select("*")
          .single();
        if (error) throw error;
        result.push(audienceSegmentFromDb(data));
      } else {
        const { data, error } = await supabaseServer
          .from("audience_segments")
          .insert(payload)
          .select("*")
          .single();
        if (error) throw error;
        result.push(audienceSegmentFromDb(data));
      }
    }

    return NextResponse.json({ segments: result });
  } catch (error) {
    console.error("sync audience segments failed:", error);
    return NextResponse.json(
      { error: "Failed to save audience segments." },
      { status: 500 }
    );
  }
}
