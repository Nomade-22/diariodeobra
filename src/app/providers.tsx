'use client';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { useState } from 'react';
import { AuthProvider } from '@/hooks/useAuth';
function makeQueryClient(){return new QueryClient({defaultOptions:{queries:{staleTime:60000}}});}
let browserQueryClient:QueryClient|undefined;
function getQueryClient(){if(typeof window==='undefined')return makeQueryClient();if(!browserQueryClient)browserQueryClient=makeQueryClient();return browserQueryClient;}
export function Providers({children}:{children:ReactNode}){const[queryClient]=useState(()=>getQueryClient());return <QueryClientProvider client={queryClient}><AuthProvider>{children}</AuthProvider><Toaster position="bottom-right"/></QueryClientProvider>;}
