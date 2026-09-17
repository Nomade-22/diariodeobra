import { NextResponse } from "next/server";

import sql from "@/app/api/utils/sql";
import { parseId } from "@/app/api/_helpers/obra-auth";

export const dynamic = "force-dynamic";

// DELETE /api/funcionarios/:id
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const funcionarioId = parseId(id);

  if (funcionarioId === null) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  await sql`DELETE FROM funcionarios WHERE id = ${funcionarioId}`;

  return NextResponse.json({ success: true });
}
