import sql from "@/app/api/utils/sql";
import { rows } from "@/app/api/_helpers/obra-auth";

export const DASHBOARD_API_URL =
  "https://dashboardmultprest.mocha.app/api/public/diary-entries";

export interface RegistroFuncionario {
  id: number;
  nome: string;
}

export interface RegistroRow {
  id: number;
  data: string | null;
  chegada: string | null;
  saida: string | null;
  trabalho: string | null;
  observacoes: string | null;
  foto_inicio_key: string | null;
  foto_fim_key: string | null;
  foto_observacoes_key: string | null;
  created_by: string | null;
  of_id: number | null;
  of_number: string | null;
  of_title: string | null;
  of_customer_name: string | null;
  cliente_nome: string | null;
  cliente_id: number | null;
}

/** Hours between two `HH:MM` strings, rounded to 2 decimals. */
export function calculateHoursWorked(chegada: string, saida: string): number {
  const [chegadaH, chegadaM] = chegada.split(":").map(Number);
  const [saidaH, saidaM] = saida.split(":").map(Number);

  if (
    !Number.isFinite(chegadaH) ||
    !Number.isFinite(chegadaM) ||
    !Number.isFinite(saidaH) ||
    !Number.isFinite(saidaM)
  ) {
    return 0;
  }

  const chegadaMinutes = chegadaH * 60 + chegadaM;
  const saidaMinutes = saidaH * 60 + saidaM;

  return Math.round(((saidaMinutes - chegadaMinutes) / 60) * 100) / 100;
}

/** Fire-and-forget push to the external Multprest dashboard. Never throws. */
export async function sendToDashboard(entry: {
  of_number: string;
  employee_name: string;
  entry_date: string;
  hours_worked: number;
  description: string;
  notes: string;
  external_id: number;
}): Promise<void> {
  try {
    await fetch(DASHBOARD_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  } catch (error) {
    console.error("Failed to send to dashboard:", error);
  }
}

/**
 * The funcionarios attached to a set of registros, grouped by registro id.
 *
 * The worker ran one query per registro; the dataset is small enough that a
 * single grouped read produces the same payload with far fewer round trips.
 */
export async function loadFuncionariosByRegistro(): Promise<
  Map<number, RegistroFuncionario[]>
> {
  const links = rows<{ registro_id: number; id: number; nome: string }>(
    await sql`
      SELECT rf.registro_id::int AS registro_id, f.id::int AS id, f.nome
      FROM funcionarios f
      JOIN registro_funcionarios rf ON f.id = rf.funcionario_id
      ORDER BY rf.id
    `
  );

  const grouped = new Map<number, RegistroFuncionario[]>();
  for (const link of links) {
    const bucket = grouped.get(link.registro_id);
    if (bucket) {
      bucket.push({ id: link.id, nome: link.nome });
    } else {
      grouped.set(link.registro_id, [{ id: link.id, nome: link.nome }]);
    }
  }
  return grouped;
}

/** Normalize a `funcionario_ids` payload into positive integers. */
export function parseFuncionarioIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const ids: number[] = [];
  for (const raw of value) {
    const parsed = typeof raw === "number" ? raw : Number(raw);
    if (Number.isInteger(parsed) && parsed > 0) ids.push(parsed);
  }
  return ids;
}
