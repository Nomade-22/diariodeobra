import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
export async function GET(request: Request) { const session=await auth.api.getSession({headers:request.headers}); if(!session?.user||!session?.session)return NextResponse.json({error:'Unauthorized'},{status:401}); return NextResponse.json({jwt:session.session.token,user:{id:session.user.id,email:session.user.email,name:session.user.name}}); }
