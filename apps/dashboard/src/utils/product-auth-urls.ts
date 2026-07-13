/** Clerk redirect-origin allowlist for the single-host Platform deployment. */
export function buildClerkAllowedRedirectOrigins(): Array<string | RegExp> {
  const origins: Array<string | RegExp> = ['http://localhost:*'];

  if (typeof window === 'undefined') {
    return origins;
  }

  origins.push(window.location.origin);

  return [...new Set(origins)];
}

/** Clerk may put auth params in the query string or inside hash routing (#/?param=). */
export function readClerkAuthParamFromLocation(param: string, searchParams?: URLSearchParams): string | null {
  const fromPassedSearch = searchParams?.get(param);

  if (fromPassedSearch) {
    return fromPassedSearch;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const fromWindowSearch = new URLSearchParams(window.location.search).get(param);

  if (fromWindowSearch) {
    return fromWindowSearch;
  }

  const hash = window.location.hash;

  if (!hash || hash.length <= 1) {
    return null;
  }

  const hashBody = hash.startsWith('#') ? hash.slice(1) : hash;
  const queryIndex = hashBody.indexOf('?');

  if (queryIndex === -1) {
    return null;
  }

  return new URLSearchParams(hashBody.slice(queryIndex + 1)).get(param);
}

/** Clerk may put redirect_url in the query string or inside hash routing (#/?redirect_url=). */
export function readClerkRedirectUrlParam(searchParams?: URLSearchParams): string | null {
  return readClerkAuthParamFromLocation('redirect_url', searchParams);
}
