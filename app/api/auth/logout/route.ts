import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-auth";

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  if (supabase) await supabase.auth.signOut();

  const origin = new URL(req.url).origin;
  return NextResponse.redirect(new URL("/login", origin), { status: 302 });
}
