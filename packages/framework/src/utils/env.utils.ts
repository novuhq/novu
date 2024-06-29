export const getResponse = (): typeof Response => {
  if (typeof Response !== 'undefined') {
    return Response;
  }

  return require('cross-fetch').Response;
};

export const getBridgeUrl = async (): Promise<string> => {
  if (process.env.NOVU_BRIDGE_ORIGIN) {
    return `${process.env.NOVU_BRIDGE_ORIGIN}/api/novu`;
  }

  // Vercel preview deployments
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/api/novu`;
  }

  // Local environments
  if (process.env.NODE_ENV === 'development') {
    return `${(await (await fetch('http://localhost:40624/.well-known/novu')).json()).bridgeUrl}/api/novu`;
  }

  return '';
};
