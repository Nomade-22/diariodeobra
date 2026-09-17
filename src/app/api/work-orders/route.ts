import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const WORK_ORDERS_API_URL =
  "https://dashboardmultprest.mocha.app/api/public/work-orders";

// GET /api/work-orders — proxy for the external Multprest work-orders API.
export async function GET(req: NextRequest) {
  const year = req.nextUrl.searchParams.get("year");
  const url = year
    ? `${WORK_ORDERS_API_URL}?year=${encodeURIComponent(year)}`
    : WORK_ORDERS_API_URL;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "DiarioDeObra/1.0",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Work orders API error:", res.status, text);
      return NextResponse.json(
        { error: `Erro ao buscar OFs: ${res.status}` },
        { status: 500 }
      );
    }

    const data = (await res.json()) as unknown[];
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch work orders:", error);
    return NextResponse.json(
      { error: "Erro ao conectar com API externa" },
      { status: 500 }
    );
  }
}
