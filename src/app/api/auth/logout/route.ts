import { NextResponse } from "next/server";

import {
  OBRA_SESSION_COOKIE,
  obraSessionCookieOptions,
} from "@/app/api/_helpers/obra-auth";

export const dynamic = "force-dynamic";

// POST /api/auth/logout
export async function POST() {
  const res = NextResponse.json({ success: true });

  res.cookies.set(OBRA_SESSION_COOKIE, "", {
    ...obraSessionCookieOptions,
    maxAge: 0,
  });

  return res;
}
