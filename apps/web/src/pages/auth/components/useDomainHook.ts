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

      // @ts-ignore
      // eslint-disable-next-line import/extensions
      'https://unpkg.com/tldts/dist/es6/index.js?module'
    )
      // eslint-disable-next-line no-return-assign
      .then((mod) => (tldParser.current = mod))
      // eslint-disable-next-line no-return-assign
      .catch(() => (tldParser.current = null));
  }, []);

  const parse = useCallback((url: string) => {
    // eslint-disable-next-line no-param-reassign
    url = stripProtocol(url);

    if (tldParser.current) {
      return (tldParser.current as any).parse(url, { allowPrivateDomains: true }) as DomainInfo;
    }

    return fallbackParser(url);
  }, []);

  return { parse };
}
