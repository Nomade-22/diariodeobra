import { NextResponse, type NextRequest } from "next/server";
import sql from "@/app/api/utils/sql";
import { readJson, rows } from "@/app/api/_helpers/obra-auth";
export const dynamic="force-dynamic";
interface FuncionarioRow{id:number;nome:string;}
export async function GET(){return NextResponse.json(rows<FuncionarioRow>(await sql`SELECT id::int AS id,nome FROM funcionarios ORDER BY nome`));}
export async function POST(req:NextRequest){const body=await readJson(req);const nome=typeof body.nome==="string"?body.nome.trim():"";if(!nome)return NextResponse.json({error:"Nome é obrigatório"},{status:400});const created=rows<FuncionarioRow>(await sql`INSERT INTO funcionarios (nome) VALUES (${nome}) RETURNING id::int AS id,nome`);return NextResponse.json(created[0]??null,{status:201});}
