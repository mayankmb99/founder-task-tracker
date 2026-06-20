import { NextRequest, NextResponse } from "next/server";
import { DEMO_USER_ID, supabaseServer } from "@/lib/supabaseServer";
import { companyProfileFromDb } from "@/lib/dbMappers";
import { CompanyProfile } from "@/lib/types";

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const profile: CompanyProfile | undefined = body?.profile;
  if (!profile) {
    return NextResponse.json({ error: "Missing 'profile' in body." }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseServer
      .from("company_profiles")
      .upsert(
        {
          user_id: DEMO_USER_ID,
          company_name: profile.companyName,
          company_description: profile.companyDescription,
          product_or_service: profile.productOrService,
          problem_solved: profile.problemSolved,
          value_proposition: profile.valueProposition,
          differentiation: profile.differentiation,
          traction: profile.traction,
          customers: profile.customers,
          proof_points: profile.proofPoints,
          case_studies: profile.caseStudies,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ profile: companyProfileFromDb(data) });
  } catch (error) {
    console.error("save company profile failed:", error);
    return NextResponse.json(
      { error: "Failed to save company profile." },
      { status: 500 }
    );
  }
}
