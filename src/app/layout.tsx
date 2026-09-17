import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./global.css";
import { Providers } from "./providers";
export const metadata:Metadata={title:"Diário de Obra",description:"Controle de atividades de obra"};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="pt-BR"><body><Providers>{children}</Providers></body></html>;}
