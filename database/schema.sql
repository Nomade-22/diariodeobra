-- Schema
--
-- PostgreSQL database dump
--

-- Dumped from database version 17.11 (c4ba6b8)
-- Dumped by pg_dump version 17.11 (c4ba6b8)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.account (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp with time zone,
    "refreshTokenExpiresAt" timestamp with time zone,
    scope text,
    password text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    issuer text
);

CREATE TABLE public.app_users (
    id bigint NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    nome text,
    is_admin integer DEFAULT 0,
    created_at text DEFAULT (CURRENT_TIMESTAMP)::text,
    updated_at text DEFAULT (CURRENT_TIMESTAMP)::text
);

CREATE SEQUENCE public.app_users_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.app_users_id_seq OWNED BY public.app_users.id;

CREATE TABLE public.clientes (
    id bigint NOT NULL,
    nome text NOT NULL,
    created_at text DEFAULT (CURRENT_TIMESTAMP)::text,
    updated_at text DEFAULT (CURRENT_TIMESTAMP)::text
);
CREATE SEQUENCE public.clientes_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;

CREATE TABLE public.funcionarios (
    id bigint NOT NULL,
    nome text NOT NULL,
    created_at text DEFAULT (CURRENT_TIMESTAMP)::text,
    updated_at text DEFAULT (CURRENT_TIMESTAMP)::text
);
CREATE SEQUENCE public.funcionarios_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.funcionarios_id_seq OWNED BY public.funcionarios.id;

CREATE TABLE public.registro_funcionarios (
    id bigint NOT NULL,
    registro_id bigint,
    funcionario_id bigint,
    created_at text DEFAULT (CURRENT_TIMESTAMP)::text,
    updated_at text DEFAULT (CURRENT_TIMESTAMP)::text
);
CREATE SEQUENCE public.registro_funcionarios_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.registro_funcionarios_id_seq OWNED BY public.registro_funcionarios.id;

CREATE TABLE public.registros (
    id bigint NOT NULL,
    cliente_id bigint,
    data text,
    chegada text,
    saida text,
    trabalho text,
    observacoes text,
    foto_inicio_key text,
    foto_fim_key text,
    foto_observacoes_key text,
    created_at text DEFAULT (CURRENT_TIMESTAMP)::text,
    updated_at text DEFAULT (CURRENT_TIMESTAMP)::text,
    created_by text,
    of_id bigint,
    of_number text,
    of_title text,
    of_customer_name text
);
CREATE SEQUENCE public.registros_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.registros_id_seq OWNED BY public.registros.id;

CREATE TABLE public.session (
    id text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL
);

CREATE TABLE public."user" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "emailVerified" boolean DEFAULT false NOT NULL,
    image text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.app_users ALTER COLUMN id SET DEFAULT nextval('public.app_users_id_seq'::regclass);
ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);
ALTER TABLE ONLY public.funcionarios ALTER COLUMN id SET DEFAULT nextval('public.funcionarios_id_seq'::regclass);
ALTER TABLE ONLY public.registro_funcionarios ALTER COLUMN id SET DEFAULT nextval('public.registro_funcionarios_id_seq'::regclass);
ALTER TABLE ONLY public.registros ALTER COLUMN id SET DEFAULT nextval('public.registros_id_seq'::regclass);

ALTER TABLE ONLY public.account ADD CONSTRAINT account_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.app_users ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.app_users ADD CONSTRAINT app_users_username_key UNIQUE (username);
ALTER TABLE ONLY public.clientes ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.funcionarios ADD CONSTRAINT funcionarios_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.registro_funcionarios ADD CONSTRAINT registro_funcionarios_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.registros ADD CONSTRAINT registros_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.session ADD CONSTRAINT session_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.session ADD CONSTRAINT session_token_key UNIQUE (token);
ALTER TABLE ONLY public."user" ADD CONSTRAINT user_email_key UNIQUE (email);
ALTER TABLE ONLY public."user" ADD CONSTRAINT user_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.verification ADD CONSTRAINT verification_pkey PRIMARY KEY (id);

CREATE INDEX idx_account_provider ON public.account USING btree ("providerId", "accountId");
CREATE INDEX idx_account_userid ON public.account USING btree ("userId");
CREATE INDEX idx_session_userid ON public.session USING btree ("userId");
CREATE INDEX idx_verification_identifier ON public.verification USING btree (identifier);

ALTER TABLE ONLY public.account ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.session ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;

-- Estrutura somente. Dados reais do banco original não são incluídos neste repositório.
