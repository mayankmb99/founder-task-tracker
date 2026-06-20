import { NextRequest, NextResponse } from "next/server";
import { DEMO_USER_ID, supabaseServer } from "@/lib/supabaseServer";
import { founderProfileFromDb } from "@/lib/dbMappers";
import { FounderProfile } from "@/lib/types";

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const profile: FounderProfile | undefined = body?.profile;
  if (!profile) {
    return NextResponse.json({ error: "Missing 'profile' in body." }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseServer
      .from("founder_profiles")
      .upsert(
        {
          user_id: DEMO_USER_ID,
          founder_name: profile.founderName,
          role: profile.role,
          professional_summary: profile.professionalSummary,
          relevant_experience: profile.relevantExperience,
          strengths: profile.strengths,
          achievements: profile.achievements,
          communication_style: profile.communicationStyle,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ profile: founderProfileFromDb(data) });
  } catch (error) {
    console.error("save founder profile failed:", error);
    return NextResponse.json(
      { error: "Failed to save founder profile." },
      { status: 500 }
    );
  }
}
