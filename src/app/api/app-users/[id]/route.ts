import { NextResponse } from "next/server";

import sql from "@/app/api/utils/sql";
import {
  hashPassword,
  parseId,
  readJson,
  rows,
  type ObraUserRow,
} from "@/app/api/_helpers/obra-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/app-users/:id
export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const userId = parseId(id);

  if (userId === null) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  const body = await readJson(req);
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const nome = typeof body.nome === "string" ? body.nome : null;
  // BOOLEAN is stored as INTEGER 0/1 in the migrated Postgres schema.
  const isAdmin = body.is_admin ? 1 : 0;

  if (!username) {
    return NextResponse.json({ error: "Usuário é obrigatório" }, { status: 400 });
  }

  const existing = rows<{ id: number }>(
    await sql`
      SELECT id::int AS id
      FROM app_users
      WHERE username = ${username} AND id != ${userId}
      LIMIT 1
    `
  );

  if (existing[0]) {
    return NextResponse.json({ error: "Nome de usuário já existe" }, { status: 400 });
  }

  if (password) {
    await sql`
      UPDATE app_users SET
        username = ${username},
        password_hash = ${hashPassword(password)},
        nome = ${nome},
        is_admin = ${isAdmin},
        updated_at = (CURRENT_TIMESTAMP)::text
      WHERE id = ${userId}
    `;
  } else {
    await sql`
      UPDATE app_users SET
        username = ${username},
        nome = ${nome},
        is_admin = ${isAdmin},
        updated_at = (CURRENT_TIMESTAMP)::text
      WHERE id = ${userId}
    `;
  }

  const updated = rows<ObraUserRow>(
    await sql`
      SELECT id::int AS id, username, nome, is_admin::int AS is_admin
      FROM app_users
      WHERE id = ${userId}
      LIMIT 1
    `
  );

  return NextResponse.json(updated[0] ?? null);
}

// DELETE /api/app-users/:id
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const userId = parseId(id);

  if (userId === null) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  // Prevent deleting the last admin. COUNT(*) is bigint in Postgres and would
  // come back as a string, so cast it to int before comparing.
  const adminCount = rows<{ count: number }>(
    await sql`SELECT COUNT(*)::int AS count FROM app_users WHERE is_admin = 1`
  );

  const target = rows<{ is_admin: number }>(
    await sql`SELECT is_admin::int AS is_admin FROM app_users WHERE id = ${userId} LIMIT 1`
  );

  if (target[0]?.is_admin === 1 && adminCount[0]?.count === 1) {
    return NextResponse.json(
      { error: "Não é possível excluir o último administrador" },
      { status: 400 }
    );
  }

  await sql`DELETE FROM app_users WHERE id = ${userId}`;

  return NextResponse.json({ success: true });
}
