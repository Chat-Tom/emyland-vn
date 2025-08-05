const tokenMap = new Map<string, { email: string, expiresAt: number }>();

export function createResetToken(email: string): string {
  const token = Math.random().toString(36).substr(2, 16);
  const expiresAt = Date.now() + 1000 * 60 * 30; // 30 phút
  tokenMap.set(token, { email, expiresAt });
  return token;
}

export function getEmailByToken(token: string): string | null {
  const data = tokenMap.get(token);
  if (!data) return null;
  if (Date.now() > data.expiresAt) {
    tokenMap.delete(token);
    return null;
  }
  return data.email;
}

export function removeToken(token: string) {
  tokenMap.delete(token);
}
