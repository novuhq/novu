// Environment variable access patterns for different frameworks
export const ENV_ACCESS_PATTERNS: Record<string, string> = {
  'Next.js': 'process.env.NEXT_PUBLIC_NOVU_APP_IDENTIFIER',
  React: 'import.meta.env.VITE_NOVU_APP_IDENTIFIER',
  JavaScript: 'process.env.NOVU_APP_IDENTIFIER',
  Angular: 'environment.novuAppIdentifier',
  Vue: 'import.meta.env.VITE_NOVU_APP_IDENTIFIER',
  Remix: 'ENV.NOVU_APP_IDENTIFIER', // Access via useLoaderData() hook
  Native: 'process.env.EXPO_PUBLIC_NOVU_APP_IDENTIFIER', // Use EXPO_PUBLIC_ prefix for runtime access
};

// Interface for Novu configuration
export interface NovuConfig {
  backendUrl?: string;
  socketUrl?: string;
  applicationIdentifier?: string;
  subscriberId?: string;
}
