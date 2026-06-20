import { NextRequest, NextResponse } from "next/server";
import { DEMO_USER_ID, supabaseServer } from "@/lib/supabaseServer";
import { taskFromDb, taskSourceToDb } from "@/lib/dbMappers";
import { Task } from "@/lib/types";

// Bulk-inserts preparation/follow-up tasks. Duplicate protection compares
// only real task values already supported by the schema; interaction IDs
// are never encoded in an unrelated task column.
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
      .select("title, source, due_date, due_time, reminder_minutes, status")
      .eq("user_id", DEMO_USER_ID)
      .eq("status", "pending");

    if (existingError) throw existingError;

    const existingKeys = new Set(
      (existing ?? []).map((task) =>
        [
          task.title,
          task.source,
          task.due_date ?? "",
          (task.due_time ?? "").slice(0, 5),
          task.reminder_minutes,
          task.status,
        ].join("\u0000")
      )
    );
    const tasksToInsert = tasks.filter(
      (task) =>
        !existingKeys.has(
          [
            task.title,
            taskSourceToDb(task.source),
            task.dueDate,
            task.dueTime,
            task.reminderMinutes,
            task.status,
          ].join("\u0000")
        )
    );

    if (tasksToInsert.length === 0) {
      return NextResponse.json({ skipped: true, tasks: [] });
    }

    const { data, error } = await supabaseServer
      .from("tasks")
      .insert(
        tasksToInsert.map((t) => ({
          user_id: DEMO_USER_ID,
          title: t.title,
          source: taskSourceToDb(t.source),
          due_date: t.dueDate || null,
          due_time: t.dueTime || null,
          reminder_minutes: t.reminderMinutes,
          status: t.status,
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
