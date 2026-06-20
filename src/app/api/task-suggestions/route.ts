import { NextRequest, NextResponse } from "next/server";
import { DEMO_USER_ID, supabaseServer } from "@/lib/supabaseServer";
import { taskFromDb } from "@/lib/dbMappers";

const REMINDER_VALUES = new Set([5, 10, 15, 30]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const suggestionId: string | undefined = body?.suggestionId;
  const task = body?.task;

  if (
    !suggestionId ||
    typeof task?.title !== "string" ||
    !task.title.trim() ||
    typeof task?.dueDate !== "string" ||
    !DATE_PATTERN.test(task.dueDate) ||
    typeof task?.dueTime !== "string" ||
    !TIME_PATTERN.test(task.dueTime) ||
    !REMINDER_VALUES.has(task?.reminderMinutes)
  ) {
    return NextResponse.json(
      { error: "Title, due date, due time, and a valid reminder are required." },
      { status: 400 }
    );
  }

  try {
    const { data: claimed, error: claimError } = await supabaseServer
      .from("task_suggestions")
      .update({
        status: "added",
        task_title: task.title.trim(),
        due_date: task.dueDate,
        due_time: task.dueTime,
        updated_at: new Date().toISOString(),
      })
      .eq("id", suggestionId)
      .eq("user_id", DEMO_USER_ID)
      .eq("is_action_item", true)
      .eq("status", "pending")
      .is("target_task_id", null)
      .select("id, task_owner")
      .maybeSingle();

    if (claimError) throw claimError;
    if (!claimed) {
      return NextResponse.json(
        { error: "This suggestion was already added or dismissed." },
        { status: 409 }
      );
    }

    const { data: insertedTask, error: taskError } = await supabaseServer
      .from("tasks")
      .insert({
        user_id: DEMO_USER_ID,
        title: task.title.trim(),
        source: "manual",
        due_date: task.dueDate,
        due_time: task.dueTime,
        reminder_minutes: task.reminderMinutes,
        task_owner: claimed.task_owner,
        status: "pending",
      })
      .select("*")
      .single();

    if (taskError) {
      await supabaseServer
        .from("task_suggestions")
        .update({ status: "pending", updated_at: new Date().toISOString() })
        .eq("id", suggestionId)
        .eq("user_id", DEMO_USER_ID)
        .is("target_task_id", null);
      throw taskError;
    }

    const { error: linkError } = await supabaseServer
      .from("task_suggestions")
      .update({
        target_task_id: insertedTask.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", suggestionId)
      .eq("user_id", DEMO_USER_ID);

    if (linkError) {
      console.error("link accepted suggestion failed:", linkError);
    }

    return NextResponse.json({ task: taskFromDb(insertedTask) });
  } catch (error) {
    console.error("accept task suggestion failed:", error);
    return NextResponse.json(
      { error: "Failed to add the suggested task." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const suggestionId: string | undefined = body?.suggestionId;
  if (!suggestionId) {
    return NextResponse.json({ error: "Missing suggestionId." }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseServer
      .from("task_suggestions")
      .update({ status: "dismissed", updated_at: new Date().toISOString() })
      .eq("id", suggestionId)
      .eq("user_id", DEMO_USER_ID)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "This suggestion was already added or dismissed." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("dismiss task suggestion failed:", error);
    return NextResponse.json(
      { error: "Failed to dismiss the suggestion." },
      { status: 500 }
    );
  }
}
