import { Pool,neonConfig } from '@neondatabase/serverless';
import { argon2Verify } from 'argon2-wasm-edge';
import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { verifyPassword } from 'better-auth/crypto';
import { bearer } from 'better-auth/plugins';
import ws from 'ws';
neonConfig.webSocketConstructor=ws;
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const trustedOrigins=Array.from(new Set([process.env.BETTER_AUTH_URL,process.env.NEXT_PUBLIC_CREATE_BASE_URL,...(process.env.BETTER_AUTH_TRUSTED_ORIGINS??'').split(',').map(s=>s.trim()).filter(Boolean)].filter((v):v is string=>Boolean(v))));
async function verifyCompatiblePassword({hash,password}:{hash:string;password:string}){if(hash.startsWith('$argon2'))return argon2Verify({hash,password});return verifyPassword({hash,password});}
export const auth=betterAuth({database:pool,trustedOrigins,emailAndPassword:{enabled:true,requireEmailVerification:false,password:{verify:verifyCompatiblePassword}},hooks:{before:createAuthMiddleware(async(ctx)=>{if(ctx.path!=='/sign-up/email')return;const body=ctx.body as {email?:unknown;name?:unknown}|undefined;if(!body||typeof body.email!=='string')return;if(typeof body.name==='string'&&body.name.trim())return;body.name=body.email.split('@')[0]||'User';})},advanced:{cookiePrefix:'better-auth',defaultCookieAttributes:{sameSite:'none',secure:true,httpOnly:true,path:'/'}},plugins:[bearer()]});
export type Session=typeof auth.$Infer.Session;
