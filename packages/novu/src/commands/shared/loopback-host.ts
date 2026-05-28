export function isLoopbackHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);

    return (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('127.') ||
      hostname === '::1' ||
      hostname === '[::1]'
    );
  } catch {
    return false;
  }
}
