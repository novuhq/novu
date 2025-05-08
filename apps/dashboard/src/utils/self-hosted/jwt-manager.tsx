import { get } from '../../api/api.client';
import { SELF_HOSTED_TOKEN } from '../../config';

const JWT_STORAGE_KEY = 'self-hosted-jwt';

export async function refreshJwt(): Promise<string | null> {
  try {
    const headers: HeadersInit = SELF_HOSTED_TOKEN ? { 'novu-self-hosted-token': SELF_HOSTED_TOKEN } : {};
    const result = await get<{ data: { token: string } }>('/auth/self-hosted', { headers });
    const token = result?.data?.token;

    if (token) {
      localStorage.setItem(JWT_STORAGE_KEY, token);
      return token;
    }

    return null;
  } catch (error) {
    console.error('Failed to refresh JWT token:', error);
    return null;
  }
}

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

export async function getValidJwtToken(): Promise<string | null> {
  const currentToken = getJwtToken();

  if (isJwtValid(currentToken)) {
    return currentToken;
  }

  return refreshJwt();
}
