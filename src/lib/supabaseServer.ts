import { createClient } from "@supabase/supabase-js";

// Server-only. This file must never be imported from a "use client"
// component — it holds the service-role key, which bypasses Row Level
// Security entirely. Importing it into client code would bundle that
// key into the browser. The guard below fails fast if that ever happens.
if (typeof window !== "undefined") {
  throw new Error(
    "supabaseServer.ts was imported into client/browser code. This must only be used inside server-side API routes."
  );
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "Supabase server client is missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local."
  );
}

export const supabaseServer = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});

export const DEMO_USER_ID = "demo-founder";
