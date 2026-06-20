import { NextResponse } from "next/server";
import { DEMO_USER_ID, supabaseServer } from "@/lib/supabaseServer";
import {
  audienceSegmentFromDb,
  eventFromDb,
  eventTargetToDb,
  eventToDb,
  eventStrategyFromDb,
  eventTargetFromDb,
  companyProfileFromDb,
  founderProfileFromDb,
  settingsFromDb,
  taskFromDb,
  taskSourceToDb,
} from "@/lib/dbMappers";
import {
  initialAudienceSegments,
  initialCompanyProfile,
  initialEvents,
  initialFounderProfile,
  initialTasks,
} from "@/lib/mockData";

// Seeds the database for the demo user exactly once, the first time
// bootstrap runs against tables that are completely empty for that
// user. Every check below is "does any row already exist?" before
// inserting, so re-running this route never creates duplicate seed
// data, even if called multiple times concurrently on first load.
async function seedIfEmpty() {
  const { count: taskCount } = await supabaseServer
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", DEMO_USER_ID);

  if (!taskCount) {
    await supabaseServer.from("tasks").insert(
      initialTasks.map((t) => ({
        user_id: DEMO_USER_ID,
        title: t.title,
        source: taskSourceToDb(t.source),
        due_date: t.dueDate || null,
        due_time: t.dueTime || null,
        reminder_minutes: t.reminderMinutes,
        status: t.status,
      }))
    );
  }

  const { data: founderRow } = await supabaseServer
    .from("founder_profiles")
    .select("user_id")
    .eq("user_id", DEMO_USER_ID)
    .maybeSingle();

  if (!founderRow) {
    await supabaseServer.from("founder_profiles").insert({
      user_id: DEMO_USER_ID,
      founder_name: initialFounderProfile.founderName,
      role: initialFounderProfile.role,
      professional_summary: initialFounderProfile.professionalSummary,
      relevant_experience: initialFounderProfile.relevantExperience,
      strengths: initialFounderProfile.strengths,
      achievements: initialFounderProfile.achievements,
      communication_style: initialFounderProfile.communicationStyle,
    });
  }

  const { data: companyRow } = await supabaseServer
    .from("company_profiles")
    .select("user_id")
    .eq("user_id", DEMO_USER_ID)
    .maybeSingle();

  if (!companyRow) {
    await supabaseServer.from("company_profiles").insert({
      user_id: DEMO_USER_ID,
      company_name: initialCompanyProfile.companyName,
      company_description: initialCompanyProfile.companyDescription,
      product_or_service: initialCompanyProfile.productOrService,
      problem_solved: initialCompanyProfile.problemSolved,
      value_proposition: initialCompanyProfile.valueProposition,
      differentiation: initialCompanyProfile.differentiation,
      traction: initialCompanyProfile.traction,
      customers: initialCompanyProfile.customers,
      proof_points: initialCompanyProfile.proofPoints,
      case_studies: initialCompanyProfile.caseStudies,
    });
  }

  const { count: audienceCount } = await supabaseServer
    .from("audience_segments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", DEMO_USER_ID);

  if (!audienceCount) {
    await supabaseServer.from("audience_segments").insert(
      initialAudienceSegments.map((a) => ({
        user_id: DEMO_USER_ID,
        name: a.name,
        roles: a.roles,
        company_types: a.companyTypes,
        problems: a.problems,
        needs: a.needs,
        objections: a.objections,
        desired_outcomes: a.desiredOutcomes,
      }))
    );
  }

  const { count: eventCount } = await supabaseServer
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", DEMO_USER_ID);

  if (!eventCount) {
    for (const e of initialEvents) {
      const { data: eventRow, error } = await supabaseServer
        .from("events")
        .insert({
          user_id: DEMO_USER_ID,
          external_event_id: e.id,
          ...eventToDb(e),
        })
        .select("id")
        .single();

      if (error || !eventRow) continue;

      if (e.targets.length) {
        await supabaseServer.from("event_targets").insert(
          e.targets.map((t) => ({
            user_id: DEMO_USER_ID,
            event_id: eventRow.id,
            ...eventTargetToDb(t),
          }))
        );
      }
    }
  }
}

export async function GET() {
  try {
    await seedIfEmpty();

    const [
      tasksRes,
      settingsRes,
      founderRes,
      companyRes,
      audienceRes,
      eventsRes,
      targetsRes,
      strategiesRes,
    ] = await Promise.all([
      supabaseServer
        .from("tasks")
        .select("*")
        .eq("user_id", DEMO_USER_ID)
        .order("created_at", { ascending: true }),
      supabaseServer
        .from("settings")
        .select("*")
        .eq("user_id", DEMO_USER_ID)
        .maybeSingle(),
      supabaseServer
        .from("founder_profiles")
        .select("*")
        .eq("user_id", DEMO_USER_ID)
        .maybeSingle(),
      supabaseServer
        .from("company_profiles")
        .select("*")
        .eq("user_id", DEMO_USER_ID)
        .maybeSingle(),
      supabaseServer
        .from("audience_segments")
        .select("*")
        .eq("user_id", DEMO_USER_ID)
        .order("created_at", { ascending: true }),
      supabaseServer
        .from("events")
        .select("*")
        .eq("user_id", DEMO_USER_ID)
        .order("created_at", { ascending: true }),
      supabaseServer
        .from("event_targets")
        .select("*")
        .eq("user_id", DEMO_USER_ID),
      supabaseServer
        .from("event_strategies")
        .select("*")
        .eq("user_id", DEMO_USER_ID)
        .order("created_at", { ascending: false }),
    ]);

    const firstError = [
      tasksRes,
      settingsRes,
      founderRes,
      companyRes,
      audienceRes,
      eventsRes,
      targetsRes,
      strategiesRes,
    ].find((r) => r.error)?.error;
    if (firstError) throw firstError;

    const audienceSegments = (audienceRes.data ?? []).map(
      audienceSegmentFromDb
    );
    // events table has no audience_segment_id column yet (would need a
    // migration). With only one audience segment in this demo, link
    // every event to it; documented as a known gap.
    const fallbackAudienceId = audienceSegments[0]?.id ?? null;

    const events = (eventsRes.data ?? []).map((row) => {
      const targets = (targetsRes.data ?? [])
        .filter((t) => t.event_id === row.id)
        .map(eventTargetFromDb);
      return eventFromDb(row, targets, fallbackAudienceId);
    });

    const strategiesByEvent: Record<string, ReturnType<typeof eventStrategyFromDb>> = {};
    for (const row of strategiesRes.data ?? []) {
      // results are ordered newest-first; keep only the first (latest) per event
      if (!strategiesByEvent[row.event_id]) {
        strategiesByEvent[row.event_id] = eventStrategyFromDb(row);
      }
    }

    return NextResponse.json({
      tasks: (tasksRes.data ?? []).map(taskFromDb),
      settings: settingsRes.data ? settingsFromDb(settingsRes.data) : null,
      founderProfile: founderRes.data
        ? founderProfileFromDb(founderRes.data)
        : null,
      companyProfile: companyRes.data
        ? companyProfileFromDb(companyRes.data)
        : null,
      audienceSegments,
      events,
      strategiesByEvent,
    });
  } catch (error) {
    console.error("bootstrap failed:", error);
    return NextResponse.json(
      { error: "Failed to load application data from the database." },
      { status: 500 }
    );
  }
}
