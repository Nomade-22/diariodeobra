import type { NextRequest } from "next/server";
import sql from "@/app/api/utils/sql";
export const OBRA_SESSION_COOKIE = "obra_session";
export const OBRA_SESSION_MAX_AGE = 60 * 24 * 60 * 60;
export const obraSessionCookieOptions = { httpOnly: true, path: "/", sameSite: "none" as const, secure: true };
export interface ObraUserRow { id: number; username: string; nome: string | null; is_admin: number; created_at?: string | null; }
export function rows<T>(result: unknown): T[] { return Array.isArray(result) ? (result as T[]) : []; }
export function hashPassword(password: string): string { return btoa(`${password}_salt_obra`); }
export function generateSessionToken(): string { const bytes = new Uint8Array(32); crypto.getRandomValues(bytes); return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(""); }
export function parseId(value: string | undefined | null): number | null { if (typeof value !== "string" || value.trim() === "") return null; const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : null; }
export function toNumberOrNull(value: unknown): number | null { if (typeof value === "number" && Number.isFinite(value)) return value; if (typeof value === "string" && value.trim() !== "") { const parsed = Number(value); if (Number.isFinite(parsed)) return parsed; } return null; }
export function toStringOrNull(value: unknown): string | null { if (typeof value === "string") return value; if (typeof value === "number" || typeof value === "boolean") return String(value); return null; }
export async function readJson(req: Request): Promise<Record<string, unknown>> { try { const parsed = await req.json(); return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}; } catch { return {}; } }
export async function getObraUser(req: NextRequest): Promise<ObraUserRow | null> { const session = req.cookies.get(OBRA_SESSION_COOKIE)?.value; if (!session) return null; const userId = parseId(session.split(":")[0]); if (userId === null) return null; const found = rows<ObraUserRow>(await sql`SELECT id::int AS id, username, nome, is_admin::int AS is_admin FROM app_users WHERE id = ${userId} LIMIT 1`); return found[0] ?? null; }
