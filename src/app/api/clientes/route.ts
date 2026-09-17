import { NextResponse, type NextRequest } from "next/server";

import sql from "@/app/api/utils/sql";
import { readJson, rows } from "@/app/api/_helpers/obra-auth";

export const dynamic = "force-dynamic";

interface ClienteRow {
  id: number;
  nome: string;
}

// GET /api/clientes
export async function GET() {
  const result = rows<ClienteRow>(
    await sql`SELECT id::int AS id, nome FROM clientes ORDER BY nome`
  );
  return NextResponse.json(result);
}

// POST /api/clientes
export async function POST(req: NextRequest) {
  const body = await readJson(req);
  const nome = typeof body.nome === "string" ? body.nome.trim() : "";

  if (!nome) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  const created = rows<ClienteRow>(
    await sql`
      INSERT INTO clientes (nome)
      VALUES (${nome})
      RETURNING id::int AS id, nome
    `
  );

  return NextResponse.json(created[0] ?? null, { status: 201 });
}
