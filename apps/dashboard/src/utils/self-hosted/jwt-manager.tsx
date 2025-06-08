const JWT_STORAGE_KEY = 'self-hosted-jwt';

export function getJwtToken(): string | null {
  return localStorage.getItem(JWT_STORAGE_KEY);
}

export function isJwtValid(token: string | null): boolean {
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    return Date.now() < expirationTime;
  } catch (error) {
    return false;
  }
}
