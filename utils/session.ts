// utils/session.ts
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON!;

type SessionLoginResp = {
  access_token: string;
  user_id: string | null;
  email: string;
};

type SessionInfo = {
  user_id: string | null;
  user_email: string;
  device_id: string;
  issued_at: string;   // ISO
  expires_at: string;  // ISO
};

function rpc(name: string, init?: RequestInit) {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      'Content-Type': 'application/json',
    },
    ...init,
  });
}

export async function sessionLogin(emailOrPhone: string, password: string, deviceId: string) {
  const res = await rpc('rpc_session_login', {
    body: JSON.stringify({
      p_email_or_phone: emailOrPhone,
      p_password: password,
      p_device_id: deviceId || `web-${crypto.randomUUID?.() || Date.now()}`,
    }),
  });
  const data = (await res.json()) as Partial<SessionLoginResp>;
  if (!res.ok || !data?.access_token) {
    throw new Error('LOGIN_FAILED');
  }
  localStorage.setItem('session_token', data.access_token);
  return data as SessionLoginResp;
}

export async function sessionMe(token = localStorage.getItem('session_token') || '') {
  const url = `${SUPABASE_URL}/rest/v1/rpc/rpc_session_me?p_access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
  });
  if (!res.ok) throw new Error('SESSION_ME_FAILED');
  return (await res.json()) as SessionInfo | null;
}

export async function sessionRefresh(token = localStorage.getItem('session_token') || '') {
  const res = await rpc('rpc_session_refresh', {
    body: JSON.stringify({ p_access_token: token }),
  });
  if (!res.ok) throw new Error('SESSION_REFRESH_FAILED');
  return (await res.json()) as SessionInfo | null;
}

export async function sessionLogout(token = localStorage.getItem('session_token') || '') {
  await rpc('rpc_session_logout', { body: JSON.stringify({ p_access_token: token }) });
  localStorage.removeItem('session_token');
}

/** Tiện ích: còn hạn trong N giây? */
export function sessionWillExpireSoon(session: SessionInfo | null, withinSeconds = 300) {
  if (!session?.expires_at) return true;
  return new Date(session.expires_at).getTime() - Date.now() < withinSeconds * 1000;
}
