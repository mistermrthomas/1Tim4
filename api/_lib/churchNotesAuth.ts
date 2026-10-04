/**
 * Church Notes API auth — verify Supabase JWT when cloud auth is configured.
 */

export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401; error: string };

function headerValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const direct = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(direct)) return direct[0];
  return direct;
}

export function extractBearerToken(
  headers: Record<string, string | string[] | undefined> | undefined,
): string | null {
  const auth = headerValue(headers, 'authorization') ?? headerValue(headers, 'Authorization');
  if (!auth) return null;
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return match?.[1]?.trim() || null;
}

/**
 * When CHURCH_NOTES_REQUIRE_AUTH=true, require a valid Supabase JWT.
 * Otherwise: verify the token when present; allow a rate-limited anonymous
 * principal when absent (local-first sermon capture without cloud sign-in).
 */
export async function authorizeChurchNotesRequest(
  headers: Record<string, string | string[] | undefined> | undefined,
  options?: {
    fetchImpl?: typeof fetch;
    supabaseUrl?: string;
    supabaseAnonKey?: string;
    requireAuth?: boolean;
  },
): Promise<AuthResult> {
  const supabaseUrl =
    options?.supabaseUrl ??
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    '';
  const supabaseAnonKey =
    options?.supabaseAnonKey ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    '';
  const requireAuth =
    options?.requireAuth ?? process.env.CHURCH_NOTES_REQUIRE_AUTH === 'true';

  const token = extractBearerToken(headers);

  if (!token) {
    if (requireAuth) {
      return { ok: false, status: 401, error: 'Sign in required to analyze church notes' };
    }
    return { ok: true, userId: 'anonymous-local' };
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    if (requireAuth) {
      return { ok: false, status: 401, error: 'Auth is required but Supabase is not configured' };
    }
    return { ok: true, userId: `token:${token.slice(0, 12)}` };
  }

  const fetchImpl = options?.fetchImpl ?? fetch;
  try {
    const res = await fetchImpl(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
    });
    if (!res.ok) {
      return { ok: false, status: 401, error: 'Invalid or expired session' };
    }
    const user = (await res.json()) as { id?: string };
    if (!user?.id) {
      return { ok: false, status: 401, error: 'Invalid session user' };
    }
    return { ok: true, userId: user.id };
  } catch {
    return { ok: false, status: 401, error: 'Could not verify session' };
  }
}
