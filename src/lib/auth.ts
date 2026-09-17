/**
 * Configuração de autenticação preservada da aplicação original e adaptada
 * para publicação na Vercel.
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import { argon2Verify } from 'argon2-wasm-edge';
import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { verifyPassword } from 'better-auth/crypto';
import { bearer } from 'better-auth/plugins';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function asHttpsOrigin(value?: string) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

const inferredBaseURL =
  process.env.BETTER_AUTH_URL ??
  asHttpsOrigin(process.env.VERCEL_URL) ??
  undefined;

const trustedOrigins = Array.from(
  new Set(
    [
      inferredBaseURL,
      asHttpsOrigin(process.env.VERCEL_URL),
      asHttpsOrigin(process.env.VERCEL_BRANCH_URL),
      asHttpsOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
      process.env.EXPO_PUBLIC_PROXY_BASE_URL,
      process.env.NEXT_PUBLIC_CREATE_BASE_URL,
      process.env.NEXT_PUBLIC_CREATE_HOST
        ? `https://${process.env.NEXT_PUBLIC_CREATE_HOST}`
        : null,
      ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ].filter((v): v is string => Boolean(v))
  )
);

const socialProviders = {
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
    ? {
        apple: {
          clientId: process.env.APPLE_CLIENT_ID,
          clientSecret: process.env.APPLE_CLIENT_SECRET,
          ...(process.env.APPLE_APP_BUNDLE_IDENTIFIER
            ? {
                appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER,
              }
            : {}),
        },
      }
    : {}),
};

async function verifyCompatiblePassword({
  hash,
  password,
}: {
  hash: string;
  password: string;
}) {
  if (hash.startsWith('$argon2')) {
    return argon2Verify({
      hash,
      password,
    });
  }

  return verifyPassword({
    hash,
    password,
  });
}

export const auth = betterAuth({
  baseURL: inferredBaseURL,
  database: pool,
  trustedOrigins,
  socialProviders,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    password: {
      verify: verifyCompatiblePassword,
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-up/email') return;
      const body = ctx.body as { email?: unknown; name?: unknown } | undefined;
      if (!body || typeof body.email !== 'string') return;
      if (typeof body.name === 'string' && body.name.trim().length > 0) return;
      const derived = body.email.split('@')[0];
      body.name = derived && derived.length > 0 ? derived : 'User';
    }),
  },
  advanced: {
    cookiePrefix: 'better-auth',
    defaultCookieAttributes: {
      sameSite: 'none',
      secure: true,
      httpOnly: true,
      path: '/',
    },
    cookies: {
      sessionToken: {
        attributes: {
          sameSite: 'none',
          secure: true,
        },
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7,
    },
  },
  user: {
    additionalFields: {
      image: {
        type: 'string',
        required: false,
      },
    },
  },
  plugins: [bearer()],
});

export type Session = typeof auth.$Infer.Session;
