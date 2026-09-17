import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./global.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
	title: "Diário de Obra",
	description: "Controle de atividades e relatórios de obra",
	icons: {
		icon: "/favicon.png",
	},
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="pt-BR">
			<head>
				<link
					rel="stylesheet"
					href="/fontawesome/releases/v6.3.0/css/pro.min.css?token=2c15cc0cc7"
				/>
			</head>
			<body>
				<Providers>
					{children}
				</Providers>
			</body>
		</html>
	);
}
