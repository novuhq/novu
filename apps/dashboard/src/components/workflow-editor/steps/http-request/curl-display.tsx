import { cn } from '@/utils/ui';
import {
  canMethodHaveBody,
  escapeShellSingleQuoted,
  getRawBodyString,
  type HttpRequestBodyValue,
  type KeyValuePair,
  NOVU_SIGNATURE_HEADER_KEY,
} from './curl-utils';

type CurlDisplayProps = {
  url: string;
  method: string;
  headers: KeyValuePair[] | Record<string, string>;
  body?: HttpRequestBodyValue;
  className?: string;
  novuSignature?: string;
};

export function CurlDisplay({ url, method, headers, body, className, novuSignature }: CurlDisplayProps) {
  const headerEntries: [string, string][] = Array.isArray(headers)
    ? headers.filter((h) => h.key).map((h) => [h.key, h.value])
    : Object.entries(headers);

  const hasNovuSignature = headerEntries.some(([k]) => k.toLowerCase() === NOVU_SIGNATURE_HEADER_KEY);

  const canHaveBody = canMethodHaveBody(method);
  let bodyStr: string | null = null;

  if (canHaveBody) {
    bodyStr = getRawBodyString(body) || null;
  }

  return (
    <div className={cn('font-mono text-xs', className)}>
      <p className="my-0 leading-normal">
        <span className="text-[#99a0ae]">{'novu $ '}</span>
        <span className="text-[#0e121b]">{'curl --location --request '}</span>
        <span className="text-[#fb4ba3]">{`'${escapeShellSingleQuoted(method.toUpperCase())}' `}</span>
        <span className="text-[#7d52f4]">{`'${escapeShellSingleQuoted(url || 'https://api.example.com/endpoint')}' `}</span>
      </p>
      {novuSignature && !hasNovuSignature && (
        <p className="my-0 leading-normal opacity-60">
          <span className="text-[#0e121b]">{'--header '}</span>
          <span className="text-[#fb4ba3]">{`'${escapeShellSingleQuoted(NOVU_SIGNATURE_HEADER_KEY)}`}</span>
          <span className="text-[#7d52f4]">{`: ${escapeShellSingleQuoted(novuSignature)}' `}</span>
        </p>
      )}
      {headerEntries.map(([key, val]) => (
        <p key={key} className="my-0 leading-normal">
          <span className="text-[#0e121b]">{'--header '}</span>
          <span className="text-[#fb4ba3]">{`'${escapeShellSingleQuoted(key)}`}</span>
          <span className="text-[#7d52f4]">{`: ${escapeShellSingleQuoted(val)}' `}</span>
        </p>
      ))}
      {bodyStr && (
        <p className="my-0 leading-normal">
          <span className="text-[#0e121b]">{'--data '}</span>
          <span className="text-[#7d52f4]">{`'${escapeShellSingleQuoted(bodyStr)}' `}</span>
        </p>
      )}
    </div>
  );
}
