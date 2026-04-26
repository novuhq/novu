import { RiGlobalLine } from 'react-icons/ri';
import { CopyButton } from '@/components/primitives/copy-button';
import { CurlDisplay } from './curl-display';
import { buildRawCurlString, getUrlDisplay, type HttpRequestBodyValue, type KeyValuePair } from './curl-utils';

type ConfigureHttpRequestStepPreviewProps = {
  controlValues: Record<string, unknown>;
  className?: string;
};

export function ConfigureHttpRequestStepPreview({ controlValues, className }: ConfigureHttpRequestStepPreviewProps) {
  const url = (controlValues.url as string) ?? '';
  const method = (controlValues.method as string) ?? 'GET';
  const headers = ((controlValues.headers as KeyValuePair[]) ?? []).filter((h) => h.key);
  const body = controlValues.body as HttpRequestBodyValue;

  const urlDisplay = getUrlDisplay(url);
  const curlString = buildRawCurlString(url, method, headers, body);

  return (
    <div className={`overflow-hidden rounded-lg border border-[#e1e4ea] ${className ?? ''}`}>
      <div className="flex items-center justify-between border-b border-[#e1e4ea] bg-[#fbfbfb] px-2 py-1.5 shadow-[0px_1px_0px_0px_#d2d2d2]">
        <div className="flex min-w-0 items-center gap-1">
          <RiGlobalLine className="size-4 shrink-0 text-text-soft" />
          <span className="truncate font-medium text-[10px] leading-[14px] text-text-soft">{urlDisplay}</span>
        </div>
        <CopyButton valueToCopy={curlString} size="2xs" className="shrink-0 p-1" />
      </div>

      <div className="relative overflow-hidden bg-white p-2">
        <CurlDisplay url={url} method={method} headers={headers} body={body} className="whitespace-pre text-[10px]" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-linear-to-r from-transparent to-white" />
      </div>
    </div>
  );
}
