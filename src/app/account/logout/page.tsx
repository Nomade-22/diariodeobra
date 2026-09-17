'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

function LogoutHandler() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { error: signOutError } = await authClient.signOut();
      if (cancelled) return;
      if (signOutError) { setError(signOutError.message ?? 'Sign out failed'); return; }
      if (typeof window !== 'undefined') window.location.href = callbackUrl;
    })();
    return () => { cancelled = true; };
  }, [callbackUrl]);
  return <main className="flex min-h-screen w-full items-center justify-center bg-gray-50 p-[16px]"><div className="flex flex-col items-center gap-[12px] text-[14px] text-gray-600">{error ? <span className="text-red-600">{error}</span> : <span>Signing out…</span>}</div></main>;
}

export default function LogoutPage() { return <Suspense><LogoutHandler /></Suspense>; }
