type CloudflareEnv = { env: Record<string, string> };

/*
 * https://remix.run/blog/remix-vite-stable#cloudflare-pages-support
 */

// biome-ignore lint/suspicious/noExplicitAny: Cloudflare context is an untyped runtime bag checked by the predicate
const hasCloudflareProxyContext = (context: any): context is { cloudflare: CloudflareEnv } => {
  return !!context?.cloudflare?.env;
};

// biome-ignore lint/suspicious/noExplicitAny: Cloudflare context is an untyped runtime bag checked by the predicate
const hasCloudflareContext = (context: any): context is CloudflareEnv => {
  return !!context?.env;
};

/**
 *
 * Utility function to get env variables across Node and Edge runtimes.
 *
 * @param name Pass the name of the environment variable. The param is case-sensitive.
 * @returns string Returns the value of the environment variable if exists.
 */
export const getEnvVariable = (name: string, context?: unknown): string => {
  // Node envs
  if (typeof process !== 'undefined' && process.env && typeof process.env[name] === 'string') {
    return process.env[name] as string;
  }

  /*
   * Remix + Cloudflare pages
   * if (typeof (context?.cloudflare as CloudflareEnv)?.env !== 'undefined') {
   */
  if (hasCloudflareProxyContext(context)) {
    return context.cloudflare.env[name] || '';
  }

  // Cloudflare
  if (hasCloudflareContext(context)) {
    return context.env[name] || '';
  }

  // Check whether the value exists in the context object directly
  if (context && typeof context[name as keyof typeof context] === 'string') {
    return context[name as keyof typeof context] as string;
  }

  // Cloudflare workers
  try {
    const globalValue = globalThis[name as keyof typeof globalThis];
    // Only return a real string. A bare `return globalThis[name]` yields
    // `undefined` for a missing name (property access does not throw in Node),
    // which breaks the `: string` contract and the `return ''` fallback below.
    if (typeof globalValue === 'string') {
      return globalValue;
    }
  } catch (_) {
    // This will raise an error in Cloudflare Pages
  }

  return '';
};

export type EEAuthProvider = 'clerk' | 'better-auth';

export const isEEAuthEnabled = () => process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';

export const getEEAuthProvider = (): EEAuthProvider => {
  const provider = process.env.EE_AUTH_PROVIDER as EEAuthProvider | undefined;

  return provider || 'clerk';
};

export const isClerkEnabled = () => isEEAuthEnabled() && getEEAuthProvider() === 'clerk';

export const isBetterAuthEnabled = () => isEEAuthEnabled() && getEEAuthProvider() === 'better-auth';

/**
 * Outbound SSRF DNS-pinning for configurable provider webhooks applies on
 * Novu Cloud Enterprise builds. Self-hosted and community builds skip that
 * provider gate so operators can target internal delivery endpoints.
 *
 * Workflow HTTP request steps, the HTTP step test endpoint, and user-supplied
 * bridge URLs always enforce DNS pinning regardless of deployment mode.
 * Operators who need private targets on those paths allow-list them via
 * NOVU_SAFE_OUTBOUND_ALLOW (link-local / cloud-metadata ranges are never
 * allow-listed).
 */
export const isOutboundSsrfProtectionEnabled = (): boolean => {
  const isEnterprise = getEnvVariable('NOVU_ENTERPRISE') === 'true' || getEnvVariable('CI_EE_TEST') === 'true';
  const isSelfHosted = getEnvVariable('IS_SELF_HOSTED') === 'true';

  return isEnterprise && !isSelfHosted;
};
