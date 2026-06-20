import { NextRequest, NextResponse } from "next/server";
import { DEMO_USER_ID, supabaseServer } from "@/lib/supabaseServer";
import { taskFromDb, taskSourceToDb } from "@/lib/dbMappers";
import { Task } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const task: Task | undefined = body?.task;
  if (!task) {
    return NextResponse.json({ error: "Missing 'task' in body." }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseServer
      .from("tasks")
      .insert({
        user_id: DEMO_USER_ID,
        title: task.title,
        source: taskSourceToDb(task.source),
        due_date: task.dueDate || null,
        due_time: task.dueTime || null,
        reminder_minutes: task.reminderMinutes,
        status: task.status,
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ task: taskFromDb(data) });
  } catch (error) {
    console.error("create task failed:", error);
    return NextResponse.json({ error: "Failed to save task." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const task: Task | undefined = body?.task;
  if (!task?.id) {
    return NextResponse.json({ error: "Missing task.id in body." }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseServer
      .from("tasks")
      .update({
        title: task.title,
        source: taskSourceToDb(task.source),
        due_date: task.dueDate || null,
        due_time: task.dueTime || null,
        reminder_minutes: task.reminderMinutes,
        status: task.status,
        completed_at: task.status === "completed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id)
      .eq("user_id", DEMO_USER_ID)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ task: taskFromDb(data) });
  } catch (error) {
    console.error("update task failed:", error);
    return NextResponse.json({ error: "Failed to update task." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id: string | undefined = body?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing 'id' in body." }, { status: 400 });
  }

  try {
    const { error } = await supabaseServer
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", DEMO_USER_ID);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("delete task failed:", error);
    return NextResponse.json({ error: "Failed to delete task." }, { status: 500 });
  }
}
