import { NextRequest, NextResponse } from "next/server";
import { DEMO_USER_ID, supabaseServer } from "@/lib/supabaseServer";
import { taskFromDb, taskSourceToDb } from "@/lib/dbMappers";
import { Task } from "@/lib/types";

// Bulk-inserts a set of tasks (used for "Add preparation tasks" /
// "Add follow-up tasks" from a generated event strategy) tagged with a
// dedupeKey stored in the otherwise-unused `related_person` column.
// If tasks already exist for that dedupeKey, nothing is inserted again
// — this is what prevents duplicate prep/follow-up tasks across
// repeated clicks or page reloads, without requiring a schema change.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tasks: Task[] | undefined = body?.tasks;
  const dedupeKey: string | undefined = body?.dedupeKey;

  if (!tasks || !Array.isArray(tasks) || !dedupeKey) {
    return NextResponse.json(
      { error: "Missing 'tasks' array or 'dedupeKey' in body." },
      { status: 400 }
    );
  }

  try {
    const { data: existing, error: existingError } = await supabaseServer
      .from("tasks")
      .select("id")
      .eq("user_id", DEMO_USER_ID)
      .eq("related_person", dedupeKey)
      .limit(1);

    if (existingError) throw existingError;

    if (existing && existing.length > 0) {
      return NextResponse.json({ skipped: true, tasks: [] });
    }

    const { data, error } = await supabaseServer
      .from("tasks")
      .insert(
        tasks.map((t) => ({
          user_id: DEMO_USER_ID,
          title: t.title,
          source: taskSourceToDb(t.source),
          due_date: t.dueDate || null,
          due_time: t.dueTime || null,
          reminder_minutes: t.reminderMinutes,
          status: t.status,
          related_person: dedupeKey,
        }))
      )
      .select("*");

    if (error) throw error;
    return NextResponse.json({ skipped: false, tasks: (data ?? []).map(taskFromDb) });
  } catch (error) {
    console.error("bulk create tasks failed:", error);
    return NextResponse.json(
      { error: "Failed to save tasks." },
      { status: 500 }
    );
  }
}
