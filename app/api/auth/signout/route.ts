import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/signout
 *
 * Form-target endpoint so a plain HTML <form action="/api/auth/signout"
 * method="post"> can sign the user out without needing client-side JS.
 *
 * NOTE: only POST is exposed — GET would allow CSRF via image tags and
 * link prefetch, which could silently sign users out.
 */
async function handleSignOut(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const url = new URL("/", request.url);
  return NextResponse.redirect(url, { status: 303 });
}

export const POST = handleSignOut;
