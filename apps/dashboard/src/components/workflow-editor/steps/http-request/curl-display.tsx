import { cn } from '@/utils/ui';
import { canMethodHaveBody, type KeyValuePair, NOVU_SIGNATURE_HEADER_KEY } from './curl-utils';

type CurlDisplayProps = {
  url: string;
  method: string;
  headers: KeyValuePair[] | Record<string, string>;
  body?: KeyValuePair[] | Record<string, unknown> | null;
  className?: string;
  novuSignature?: string;
};

export function CurlDisplay({ url, method, headers, body, className, novuSignature }: CurlDisplayProps) {
  const headerEntries: [string, string][] = Array.isArray(headers)
    ? headers.filter((h) => h.key).map((h) => [h.key, h.value])
    : Object.entries(headers);

  const hasNovuSignature = headerEntries.some(([k]) => k.toLowerCase() === NOVU_SIGNATURE_HEADER_KEY);

  const canHaveBody = canMethodHaveBody(method);
  let bodyObj: Record<string, unknown> | null = null;

  if (canHaveBody && body) {
    if (Array.isArray(body)) {
      const pairs = body.filter((b) => b.key);

      if (pairs.length > 0) {
        bodyObj = Object.fromEntries(pairs.map(({ key, value }) => [key, value]));
      }
    } else if (Object.keys(body).length > 0) {
      bodyObj = body;
    }
  }

  return (
    <div className={cn('font-mono text-xs', className)}>
      <p className="my-0 leading-[1.5]">
        <span className="text-[#99a0ae]">{'novu $ '}</span>
        <span className="text-[#0e121b]">{'curl --location '}</span>
        <span className="text-[#7d52f4]">{`'${url || 'https://api.example.com/endpoint'}' `}</span>
      </p>
      {novuSignature && !hasNovuSignature && (
        <p className="my-0 leading-[1.5] opacity-60">
          <span className="text-[#0e121b]">{'--header '}</span>
          <span className="text-[#fb4ba3]">{`'${NOVU_SIGNATURE_HEADER_KEY}`}</span>
          <span className="text-[#7d52f4]">{`: ${novuSignature}' `}</span>
        </p>
      )}
      {headerEntries.map(([key, val]) => (
        <p key={key} className="my-0 leading-[1.5]">
          <span className="text-[#0e121b]">{'--header '}</span>
          <span className="text-[#fb4ba3]">{`'${key}`}</span>
          <span className="text-[#7d52f4]">{`: ${val}' `}</span>
        </p>
      ))}
      {bodyObj && (
        <p className="my-0 leading-[1.5]">
          <span className="text-[#0e121b]">{'--data '}</span>
          <span className="text-[#7d52f4]">{`'${JSON.stringify(bodyObj)}' `}</span>
        </p>
      )}
    </div>
  );
}
