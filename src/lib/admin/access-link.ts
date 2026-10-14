import { createHash, randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type AccountAccessRow = {
  id: string;
  email: string;
  full_name: string;
  auth_user_id: string | null;
};

export type GeneratedAccessLink = {
  authUserId: string;
  actionLink: string;
};

type GenerateManualAccessLinkOptions = {
  createdBy?: string;
};

export async function generateManualAccessLink(
  req: NextRequest,
  account: AccountAccessRow,
  options: GenerateManualAccessLinkOptions = {},
): Promise<GeneratedAccessLink> {
  const adminClient = createSupabaseAdminClient();
  const authUserId = await ensureAuthUser(account);
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

  const { error } = await adminClient.from("password_setup_tokens").insert({
    account_id: account.id,
    auth_user_id: authUserId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_by: options.createdBy ?? null,
  });

  if (error) throw new Error(error.message);

  return {
    authUserId,
    actionLink: `${buildBaseUrl(req)}/definir-senha?token=${encodeURIComponent(token)}`,
  };
}

export function hashPasswordSetupToken(token: string) {
  return hashToken(token);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function ensureAuthUser(account: AccountAccessRow) {
  if (account.auth_user_id) return account.auth_user_id;

  const existingUserId = await findUserIdByEmail(account.email);
  if (existingUserId) return existingUserId;

  const adminClient = createSupabaseAdminClient();
  const temporaryPassword = randomBytes(32).toString("base64url");

  const { data, error } = await adminClient.auth.admin.createUser({
    email: account.email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: account.full_name,
      account_id: account.id,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Não foi possível criar o usuário de acesso.");
  }

  return data.user.id;
}

function buildBaseUrl(req: NextRequest) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;
  const baseUrl = normalizeBaseUrl(configuredUrl) ?? normalizeBaseUrl(req.headers.get("origin"));
  if (!baseUrl) throw new Error("Missing NEXT_PUBLIC_SITE_URL.");
  return baseUrl;
}

function normalizeBaseUrl(value?: string | null) {
  if (!value) return null;

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(withProtocol);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

async function findUserIdByEmail(email: string) {
  const adminClient = createSupabaseAdminClient();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw new Error(error.message);

    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) return user.id;
    if (data.users.length < 1000) return null;
    page += 1;
  }

  return null;
}
