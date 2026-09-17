# Diário de Obra — Multprest

Aplicação web para registro e acompanhamento de diário de obra.

## Funcionalidades

- Login de usuários
- Novo registro de diário de obra
- Seleção de cliente e funcionários
- Vinculação com OFs
- Histórico de registros
- Cadastro de clientes
- Cadastro de funcionários
- Administração de usuários
- Registro de horários, atividades e observações
- Campos para fotos de início, fim e observações

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- PostgreSQL / Neon
- Better Auth

## Rodando localmente

1. Instale Node.js 20+.
2. Instale as dependências:

```bash
npm install
```

3. Copie `.env.example` para `.env.local` e configure `DATABASE_URL`.
4. Crie o banco executando `database/schema.sql` em um PostgreSQL/Neon.
5. Rode:

```bash
npm run dev
```

A aplicação abrirá em `http://localhost:4000`.

## Deploy

A arquitetura recomendada é:

- GitHub: código-fonte
- Vercel: hospedagem do Next.js e APIs
- Neon: PostgreSQL

GitHub Pages sozinho não executa as rotas de API do Next.js.

## Importante sobre fotos

A versão exportada originalmente usava o serviço de upload da plataforma onde foi criada. O código de upload precisa ser ligado a um storage externo antes do deploy definitivo (ex.: Vercel Blob, S3 ou Cloudflare R2).

## Segurança

O dump original do banco **não está incluído** neste repositório. `database/schema.sql` contém apenas a estrutura necessária, sem os registros reais da empresa.
