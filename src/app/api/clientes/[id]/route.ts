import { NextResponse } from "next/server";

import sql from "@/app/api/utils/sql";
import { parseId } from "@/app/api/_helpers/obra-auth";

export const dynamic = "force-dynamic";

// DELETE /api/clientes/:id
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const clienteId = parseId(id);

  if (clienteId === null) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  await sql`DELETE FROM clientes WHERE id = ${clienteId}`;

  return NextResponse.json({ success: true });
}
