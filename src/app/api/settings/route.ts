import { NextRequest, NextResponse } from "next/server";
import { DEMO_USER_ID, supabaseServer } from "@/lib/supabaseServer";
import { settingsFromDb } from "@/lib/dbMappers";
import { Settings } from "@/lib/types";

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const settings: Settings | undefined = body?.settings;
  if (!settings) {
    return NextResponse.json({ error: "Missing 'settings' in body." }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseServer
      .from("settings")
      .upsert(
        {
          user_id: DEMO_USER_ID,
          notifications_enabled: settings.notificationsEnabled,
          default_reminder_minutes: settings.defaultReminderMinutes,
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ settings: settingsFromDb(data) });
  } catch (error) {
    console.error("save settings failed:", error);
    return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
  }
}
