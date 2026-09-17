import { NextResponse, type NextRequest } from "next/server";

import sql from "@/app/api/utils/sql";
import {
  hashPassword,
  readJson,
  rows,
  type ObraUserRow,
} from "@/app/api/_helpers/obra-auth";

export const dynamic = "force-dynamic";

// GET /api/app-users
export async function GET() {
  const users = rows<ObraUserRow>(
    await sql`
      SELECT id::int AS id, username, nome, is_admin::int AS is_admin, created_at
      FROM app_users
      ORDER BY nome
    `
  );
  return NextResponse.json(users);
}

// POST /api/app-users
export async function POST(req: NextRequest) {
  const body = await readJson(req);
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const nome = typeof body.nome === "string" ? body.nome : null;
  // BOOLEAN is stored as INTEGER 0/1 in the migrated Postgres schema.
  const isAdmin = body.is_admin ? 1 : 0;

  if (!username || !password) {
    return NextResponse.json(
      { error: "Usuário e senha são obrigatórios" },
      { status: 400 }
    );
  }

  const existing = rows<{ id: number }>(
    await sql`SELECT id::int AS id FROM app_users WHERE username = ${username} LIMIT 1`
  );

  if (existing[0]) {
    return NextResponse.json({ error: "Nome de usuário já existe" }, { status: 400 });
  }

  // Simple password hash, kept identical to the worker so migrated hashes and
  // newly created ones stay interchangeable (for production use bcrypt/argon2).
  const passwordHash = hashPassword(password);

  const created = rows<ObraUserRow>(
    await sql`
      INSERT INTO app_users (username, password_hash, nome, is_admin)
      VALUES (${username}, ${passwordHash}, ${nome}, ${isAdmin})
      RETURNING id::int AS id, username, nome, is_admin::int AS is_admin
    `
  );

  return NextResponse.json(created[0] ?? null, { status: 201 });
}
