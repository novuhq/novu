type CloudflareEnv = { env: Record<string, string> };

// https://remix.run/blog/remix-vite-stable#cloudflare-pages-support
const hasCloudflareProxyContext = (context): context is { cloudflare: CloudflareEnv } => {
  return !!context?.cloudflare?.env;
};

const hasCloudflareContext = (context): context is CloudflareEnv => {
  return !!context?.env;
};

/**
 *
 * Utility function to get env variables across Node and Edge runtimes.
 *
 * @param name Pass the name of the environment variable. The param is case-sensitive.
 * @returns string Returns the value of the environment variable if exists.
 */
export const getEnvVariable = (name: string, context?): string => {
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
  if (context && typeof context[name] === 'string') {
    return context[name] as string;
  }

  // Cloudflare workers
  try {
    return globalThis[name as keyof typeof globalThis];
  } catch (_) {
    // This will raise an error in Cloudflare Pages
  }

  return '';
};

export const isClerkEnabled = () =>
  (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') && process.env.CLERK_ENABLED === 'true';
