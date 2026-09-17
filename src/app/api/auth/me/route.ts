import { NextResponse, type NextRequest } from "next/server";

import { getObraUser } from "@/app/api/_helpers/obra-auth";

export const dynamic = "force-dynamic";

// GET /api/auth/me
export async function GET(req: NextRequest) {
  const user = await getObraUser(req);

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      nome: user.nome,
      is_admin: user.is_admin === 1,
    },
  });
}
