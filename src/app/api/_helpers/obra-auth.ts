import type { NextRequest } from "next/server";

import sql from "@/app/api/utils/sql";

/**
 * The original Mocha worker shipped its own username/password auth against the
 * `app_users` table (cookie `obra_session`, hash `btoa(password + "_salt_obra")`).
 * That is app business logic, not Mocha's hosted users-service, so it is ported
 * as-is: the migrated `app_users.password_hash` rows must keep validating.
 *
 * better-auth still owns `/api/auth/[...all]` for platform auth; these three
 * static paths (`login`, `logout`, `me`) shadow the catch-all by design so the
 * original API contract is preserved.
 */
export const OBRA_SESSION_COOKIE = "obra_session";

/** 60 days, matching the original `setCookie(..., { maxAge: 60 * 24 * 60 * 60 })`. */
export const OBRA_SESSION_MAX_AGE = 60 * 24 * 60 * 60;

export const obraSessionCookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "none" as const,
  secure: true,
};

export interface ObraUserRow {
  id: number;
  username: string;
  nome: string | null;
  is_admin: number;
  created_at?: string | null;
}

/** Narrow an untyped neon result set to a row shape. */
export function rows<T>(result: unknown): T[] {
  return Array.isArray(result) ? (result as T[]) : [];
}

/** Same weak hash the worker used. Kept for compatibility with migrated rows. */
export function hashPassword(password: string): string {
  return btoa(`${password}_salt_obra`);
}

export function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Parse a dynamic-segment id into a positive integer, or null when unusable. */
export function parseId(value: string | undefined | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Coerce a JSON body value to a number for a bigint column, or null. */
export function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** Coerce a JSON body value to a string, or null (never `undefined` — neon rejects it). */
export function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const parsed = await req.json();
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Resolve the `obra_session` cookie back to an `app_users` row. */
export async function getObraUser(req: NextRequest): Promise<ObraUserRow | null> {
  const session = req.cookies.get(OBRA_SESSION_COOKIE)?.value;
  if (!session) return null;

  const userId = parseId(session.split(":")[0]);
  if (userId === null) return null;

  const found = rows<ObraUserRow>(
    await sql`
      SELECT id::int AS id, username, nome, is_admin::int AS is_admin
      FROM app_users
      WHERE id = ${userId}
      LIMIT 1
    `
  );
  return found[0] ?? null;
}
