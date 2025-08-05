// utils/resetTokenStore.ts
type TokenData = {
  email: string;
  expires: number; // timestamp
};

const store = new Map<string, TokenData>();

export function saveToken(token: string, email: string, expiresInMinutes = 30) {
  const expires = Date.now() + expiresInMinutes * 60 * 1000;
  store.set(token, { email, expires });
}

export function getEmailByToken(token: string): string | null {
  const data = store.get(token);
  if (!data) return null;
  if (Date.now() > data.expires) {
    store.delete(token);
    return null;
  }
  return data.email;
}

export function removeToken(token: string) {
  store.delete(token);
}
