import { NextResponse, type NextRequest } from "next/server";
export const dynamic="force-dynamic";
const ROUTE_PREFIX="/api/files/";
function safeDecode(value:string){try{return decodeURIComponent(value);}catch{return value;}}
export async function GET(req:NextRequest,ctx:{params:Promise<{key:string[]}>}){const{key}=await ctx.params;const pathname=req.nextUrl.pathname;const raw=pathname.startsWith(ROUTE_PREFIX)?safeDecode(pathname.slice(ROUTE_PREFIX.length)):(key??[]).map(safeDecode).join("/");const normalized=raw.replace(/^(https?:)\/+/i,"$1//");if(/^https?:\/\//i.test(normalized))return NextResponse.redirect(normalized,307);return NextResponse.json({error:"File not found"},{status:404});}
