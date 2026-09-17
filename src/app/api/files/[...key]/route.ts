import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const ROUTE_PREFIX = "/api/files/";

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * GET /api/files/:key{.+}
 *
 * The original worker streamed the object out of the `R2_BUCKET` binding. On
 * Anything the stored value is a public upload URL, so the equivalent of
 * "serve this key" is a redirect to that URL.
 *
 * Values that are still bare legacy Mocha R2 keys (e.g. `registros/17736…jpg`)
 * cannot be resolved — that bucket is not reachable from here — so they 404,
 * which is the same status the worker returned for a missing object.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ key: string[] }> }
) {
  const { key } = await ctx.params;

  // Rebuild from the raw pathname so an absolute URL stored as the key survives
  // segment splitting (`https://host/a/b` -> ["https:", "", "host", "a", "b"]).
  const pathname = req.nextUrl.pathname;
  const raw = pathname.startsWith(ROUTE_PREFIX)
    ? safeDecode(pathname.slice(ROUTE_PREFIX.length))
    : (key ?? []).map(safeDecode).join("/");

  // Tolerate a collapsed scheme separator ("https:/host" -> "https://host").
  const normalized = raw.replace(/^(https?:)\/+/i, "$1//");

  if (/^https?:\/\//i.test(normalized)) {
    return NextResponse.redirect(normalized, 307);
  }

  return NextResponse.json({ error: "File not found" }, { status: 404 });
}
