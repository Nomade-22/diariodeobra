import { NextResponse } from "next/server";

import sql from "@/app/api/utils/sql";
import { parseId, readJson, rows, toNumberOrNull, toStringOrNull } from "@/app/api/_helpers/obra-auth";
import { parseFuncionarioIds, type RegistroFuncionario, type RegistroRow } from "@/app/api/_helpers/registros";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params; const registroId = parseId(id);
  if (registroId === null) return NextResponse.json({ error: "Registro not found" }, { status: 404 });
  const found = rows<RegistroRow>(await sql`SELECT r.id::int AS id, r.data, r.chegada, r.saida, r.trabalho, r.observacoes, r.foto_inicio_key, r.foto_fim_key, r.foto_observacoes_key, r.created_by, r.of_id::int AS of_id, r.of_number, r.of_title, r.of_customer_name, c.nome AS cliente_nome, c.id::int AS cliente_id FROM registros r LEFT JOIN clientes c ON r.cliente_id = c.id WHERE r.id = ${registroId} LIMIT 1`);
  const registro=found[0]; if(!registro)return NextResponse.json({error:"Registro not found"},{status:404});
  const funcionarios=rows<RegistroFuncionario>(await sql`SELECT f.id::int AS id, f.nome FROM funcionarios f JOIN registro_funcionarios rf ON f.id = rf.funcionario_id WHERE rf.registro_id = ${registroId} ORDER BY rf.id`);
  return NextResponse.json({...registro,funcionarios});
}

export async function PUT(req: Request, ctx: Ctx) {
  const {id}=await ctx.params; const registroId=parseId(id); if(registroId===null)return NextResponse.json({error:"Id inválido"},{status:400});
  const body=await readJson(req); const cliente_id=toNumberOrNull(body.cliente_id); const funcionario_ids=parseFuncionarioIds(body.funcionario_ids); const data=toStringOrNull(body.data); const chegada=toStringOrNull(body.chegada); const saida=toStringOrNull(body.saida); const trabalho=toStringOrNull(body.trabalho); const observacoes=toStringOrNull(body.observacoes); const foto_inicio_key=toStringOrNull(body.foto_inicio_key); const foto_fim_key=toStringOrNull(body.foto_fim_key); const foto_observacoes_key=toStringOrNull(body.foto_observacoes_key);
  await sql`UPDATE registros SET cliente_id=${cliente_id}, data=${data}, chegada=${chegada}, saida=${saida}, trabalho=${trabalho}, observacoes=${observacoes}, foto_inicio_key=${foto_inicio_key}, foto_fim_key=${foto_fim_key}, foto_observacoes_key=${foto_observacoes_key}, updated_at=(CURRENT_TIMESTAMP)::text WHERE id=${registroId}`;
  await sql`DELETE FROM registro_funcionarios WHERE registro_id=${registroId}`;
  for(const funcId of funcionario_ids) await sql`INSERT INTO registro_funcionarios (registro_id,funcionario_id) VALUES (${registroId},${funcId})`;
  return NextResponse.json({success:true});
}

export async function DELETE(_req:Request,ctx:Ctx){const{id}=await ctx.params;const registroId=parseId(id);if(registroId===null)return NextResponse.json({error:"Id inválido"},{status:400});await sql`DELETE FROM registro_funcionarios WHERE registro_id=${registroId}`;await sql`DELETE FROM registros WHERE id=${registroId}`;return NextResponse.json({success:true});}
