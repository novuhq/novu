import { Response as CrossFetchResponse } from 'cross-fetch';

export const getResponse = (): typeof Response => {
  if (typeof Response !== 'undefined') {
    return Response;
  }

  return CrossFetchResponse;
};

export const getBridgeUrl = async (): Promise<string> => {
  /*
   * Production, staging, or local environments with bring your own local tunnel
   * An escape hatch for unknown use-cases.
   */
  if (process.env.NOVU_BRIDGE_ORIGIN) {
    return `${process.env.NOVU_BRIDGE_ORIGIN}/api/novu`;
  }

  // Vercel preview deployments
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' && process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/api/novu`;
  }

  // Local environments
  try {
    if (process.env.NODE_ENV === 'development') {
      const response = await fetch('http://localhost:2022/.well-known/novu');
      const data = await response.json();

      return `${data.tunnelOrigin}${data.route}`;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  return '';
};
