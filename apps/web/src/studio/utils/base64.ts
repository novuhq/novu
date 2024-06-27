export function encodeBase64(json: any): string {
  return btoa(JSON.stringify(json)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeBase64<T>(base64url: string): T {
  return JSON.parse(atob(base64url.replace(/-/g, '+').replace(/_/g, '/'))) as T;
}
