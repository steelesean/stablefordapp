import { NextResponse } from "next/server";
import { supabaseConfigured, getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** GET /api/health — quick check that Supabase is connected and tables exist. */
export async function GET() {
  if (!supabaseConfigured()) {
    return NextResponse.json({
      supabase: false,
      error: "SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY not set",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const supabase = getSupabase();
    const [configRes, playersRes] = await Promise.all([
      supabase.from("round_config").select("status").eq("id", 1).maybeSingle(),
      supabase.from("players").select("id", { count: "exact", head: true }),
    ]);

    if (configRes.error) throw configRes.error;
    if (playersRes.error) throw playersRes.error;

    return NextResponse.json({
      supabase: true,
      supabaseUrl: process.env.SUPABASE_URL,
      roundStatus: configRes.data?.status ?? "not seeded yet",
      playerCount: playersRes.count ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        supabase: false,
        error: err instanceof Error ? err.message : "Unknown error connecting to Supabase",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
