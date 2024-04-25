import { useCallback, useEffect, useRef } from 'react';

interface DomainInfo {
  domain: string;
  domainWithoutSuffix: string;
  hostname: string;
  isIcann: boolean;
  isIp: boolean;
  isPrivate: boolean;
  publicSuffix: string;
  subdomain: string;
}

function stripProtocol(url: string): string {
  return (url || '').replace(/(https?)?(:\/+)?/, '');
}

function fallbackParser(url: string) {
  const parts = stripProtocol(url).split('.');

  if (parts.length > 2) {
    const [subdomain, ...domainParts] = parts;

    return {
      subdomain: subdomain || '',
      domain: domainParts.join('.'),
    };
  }

  return {
    subdomain: '',
    domain: url,
  };
}

export function useDomainParser(): { parse: (url: string) => Partial<DomainInfo> } {
  const tldParser = useRef(null);

  useEffect(() => {
    import(
      /* webpackIgnore: true */
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line import/extensions
      'https://unpkg.com/tldts/dist/es6/index.js?module'
    )
      .then((mod) => (tldParser.current = mod))
      .catch(() => (tldParser.current = null));
  }, []);

  const parse = useCallback((url: string) => {
    url = stripProtocol(url);

    if (tldParser.current) {
      return (tldParser.current as any).parse(url, { allowPrivateDomains: true }) as DomainInfo;
    }

    return fallbackParser(url);
  }, []);

  return { parse };
}
