import { NextResponse, type NextRequest } from "next/server";

import { getObraUser, readJson, rows } from "@/app/api/_helpers/obra-auth";
import { calculateHoursWorked, type RegistroFuncionario } from "@/app/api/_helpers/registros";
import sql from "@/app/api/utils/sql";

export const dynamic = "force-dynamic";

const DEFAULT_DASHBOARD_API_URL =
  "https://dashboard-multprest.vercel.app/api/public/diary-entries";

type SyncRegistro = {
  id: number;
  data: string | null;
  chegada: string | null;
  saida: string | null;
  trabalho: string | null;
  observacoes: string | null;
  of_number: string | null;
  of_customer_name: string | null;
  cliente_nome: string | null;
};

type DashboardResult = {
  success?: boolean;
  id?: number;
  external_id?: string | null;
  duplicate?: boolean;
  status?: string | null;
};

function dashboardApiUrl() {
  return process.env.DASHBOARD_API_URL?.trim() || DEFAULT_DASHBOARD_API_URL;
}

function dashboardHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = process.env.DASHBOARD_SYNC_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function externalId(registroId: number) {
  return `diariodeobra:${registroId}`;
}

function parseRegistroIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((item) => Number(item))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ].slice(0, 250);
}

async function requireAdmin(req: NextRequest) {
  const user = await getObraUser(req);
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }
  if (!user.is_admin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 }),
    };
  }
  return { ok: true as const, user };
}

async function loadRegistro(registroId: number): Promise<SyncRegistro | null> {
  const found = rows<SyncRegistro>(
    await sql`
      SELECT
        r.id::int AS id,
        r.data,
        r.chegada,
        r.saida,
        r.trabalho,
        r.observacoes,
        r.of_number,
        r.of_customer_name,
        c.nome AS cliente_nome
      FROM registros r
      LEFT JOIN clientes c ON c.id = r.cliente_id
      WHERE r.id = ${registroId}
      LIMIT 1
    `,
  );
  return found[0] ?? null;
}

async function loadFuncionarios(registroId: number): Promise<RegistroFuncionario[]> {
  return rows<RegistroFuncionario>(
    await sql`
      SELECT f.id::int AS id, f.nome
      FROM funcionarios f
      JOIN registro_funcionarios rf ON rf.funcionario_id = f.id
      WHERE rf.registro_id = ${registroId}
      ORDER BY rf.id
    `,
  );
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const rawIds = req.nextUrl.searchParams.get("registro_ids") || "";
  const registroIds = rawIds
    .split(",")
    .map((value) => Number(value))
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, 250);

  if (registroIds.length === 0) {
    return NextResponse.json({ synced_ids: [], statuses: {} });
  }

  const ids = registroIds.map(externalId);
  const url = new URL(dashboardApiUrl());
  url.searchParams.set("external_ids", ids.join(","));

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: dashboardHeaders(),
      cache: "no-store",
    });
    const data = await response.json().catch(() => []);

    if (!response.ok) {
      const message =
        data && typeof data === "object" && "error" in data
          ? String((data as { error?: unknown }).error || "Falha ao consultar o Dashboard")
          : "Falha ao consultar o Dashboard";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const dashboardRows = Array.isArray(data) ? data : [];
    const syncedIds: number[] = [];
    const statuses: Record<string, string | null> = {};

    for (const item of dashboardRows) {
      if (!item || typeof item !== "object") continue;
      const row = item as { external_id?: unknown; status?: unknown };
      if (typeof row.external_id !== "string") continue;
      const match = row.external_id.match(/^diariodeobra:(\d+)$/);
      if (!match) continue;
      const id = Number(match[1]);
      if (!Number.isInteger(id)) continue;
      syncedIds.push(id);
      statuses[String(id)] =
        row.status === undefined || row.status === null ? null : String(row.status);
    }

    return NextResponse.json({
      synced_ids: [...new Set(syncedIds)],
      statuses,
    });
  } catch (error) {
    console.error("Erro ao consultar sincronização com Dashboard:", error);
    return NextResponse.json(
      { error: "Não foi possível consultar o Dashboard" },
      { status: 502 },
    );
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const body = await readJson(req);
  const registroIds = parseRegistroIds(body.registro_ids);

  if (registroIds.length === 0) {
    return NextResponse.json(
      { error: "Nenhum registro selecionado para envio" },
      { status: 400 },
    );
  }

  const payload: Array<Record<string, unknown>> = [];
  const missingIds: number[] = [];

  for (const registroId of registroIds) {
    const registro = await loadRegistro(registroId);
    if (!registro) {
      missingIds.push(registroId);
      continue;
    }

    const funcionarios = await loadFuncionarios(registroId);
    const hoursWorked = calculateHoursWorked(
      registro.chegada || "",
      registro.saida || "",
    );

    payload.push({
      of_number: registro.of_number || "",
      employee_names: funcionarios.map((funcionario) => funcionario.nome),
      entry_date: registro.data || "",
      hours_worked: hoursWorked > 0 ? hoursWorked : 0,
      description: registro.trabalho || "",
      location: registro.cliente_nome || registro.of_customer_name || "",
      weather: "",
      notes: registro.observacoes || "",
      external_id: externalId(registro.id),
    });
  }

  if (payload.length === 0) {
    return NextResponse.json(
      { error: "Nenhum registro válido encontrado", missing_ids: missingIds },
      { status: 404 },
    );
  }

  try {
    const response = await fetch(dashboardApiUrl(), {
      method: "POST",
      headers: dashboardHeaders(),
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: unknown;
      results?: DashboardResult[];
    };

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.error ? String(data.error) : "Falha ao enviar para o Dashboard",
          missing_ids: missingIds,
        },
        { status: 502 },
      );
    }

    const results = Array.isArray(data.results) ? data.results : [];
    const syncedIds = results
      .filter((result) => result?.success && typeof result.external_id === "string")
      .map((result) => {
        const match = result.external_id?.match(/^diariodeobra:(\d+)$/);
        return match ? Number(match[1]) : NaN;
      })
      .filter((id) => Number.isInteger(id));

    return NextResponse.json({
      success: true,
      requested: registroIds.length,
      sent: payload.length,
      synced_ids: [...new Set(syncedIds)],
      missing_ids: missingIds,
      results,
    });
  } catch (error) {
    console.error("Erro ao enviar registros ao Dashboard:", error);
    return NextResponse.json(
      { error: "Não foi possível conectar ao Dashboard", missing_ids: missingIds },
      { status: 502 },
    );
  }
}
