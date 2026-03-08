import { Highlight } from 'prism-react-renderer';
import { useCallback } from 'react';
import { RiFileCopyLine, RiGlobalLine, RiLoader4Line, RiPlayCircleLine } from 'react-icons/ri';
import { type TestHttpEndpointResponse } from '@/api/steps';
import { InlineToast } from '@/components/primitives/inline-toast';
import { ToastClose, ToastIcon } from '@/components/primitives/sonner';
import { showErrorToast, showToast } from '@/components/primitives/sonner-helpers';
import { useStepEditor } from '../context/step-editor-context';
import { parseJsonValue } from '../utils/preview-context.utils';
import { useHttpRequestTest } from './use-http-request-test';

type KeyValuePair = { key: string; value: string };

function TrafficLights() {
  return (
    <div className="flex items-center gap-[5px]">
      <div className="size-[10px] rounded-full bg-[#FF5F57]" />
      <div className="size-[10px] rounded-full bg-[#FEBC2E]" />
      <div className="size-[10px] rounded-full bg-[#28C840]" />
    </div>
  );
}

function BrowserShell({
  children,
  actions,
  className,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-clip rounded-lg border border-[#e1e4ea] ${className ?? ''}`}>
      <div className="relative flex h-8 items-center justify-between border-b border-[#e1e4ea] bg-[#fbfbfb] px-3 py-2 shadow-[0px_1px_0px_0px_#d2d2d2]">
        <TrafficLights />
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
          <RiGlobalLine className="size-[14px] text-[#525866]" />
          <span className="font-medium text-[12px] leading-4 text-[#525866]">Console</span>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="bg-white p-3">{children}</div>
    </div>
  );
}

function CurlDisplay({
  url,
  headers,
  method,
  body,
}: {
  url: string;
  method: string;
  headers: KeyValuePair[] | Record<string, string>;
  body?: Record<string, unknown> | null;
}) {
  const headerEntries = Array.isArray(headers)
    ? headers.filter((h) => h.key).map((h) => [h.key, h.value] as [string, string])
    : Object.entries(headers);

  return (
    <div className="font-mono text-xs">
      <p className="mb-0 leading-[1.5]">
        <span className="text-[#99a0ae]">{'novu $ '}</span>
        <span className="text-[#0e121b]">{'curl --location '}</span>
        <span className="text-[#7d52f4]">{`'${url || 'https://api.example.com/endpoint'}' `}</span>
      </p>
      {headerEntries.map(([key, val]) => (
        <p key={key} className="mb-0 leading-[1.5]">
          <span className="text-[#0e121b]">{'--header '}</span>
          <span className="text-[#fb4ba3]">{`'${key}`}</span>
          <span className="text-[#7d52f4]">{`: ${val}' `}</span>
        </p>
      ))}
      {method !== 'GET' && method !== 'DELETE' && body && Object.keys(body).length > 0 && (
        <p className="mb-0 leading-[1.5]">
          <span className="text-[#0e121b]">{'--data '}</span>
          <span className="text-[#7d52f4]">{`'${JSON.stringify(body)}' `}</span>
        </p>
      )}
    </div>
  );
}

const JSON_THEME = {
  plain: { color: '#99a0ae', backgroundColor: 'transparent' },
  styles: [
    { types: ['punctuation', 'operator'], style: { color: '#99a0ae' } },
    { types: ['property'], style: { color: '#fb4ba3' } },
    { types: ['string', 'number', 'boolean', 'null', 'keyword'], style: { color: '#7d52f4' } },
  ],
};

function JsonBody({ body }: { body: unknown }) {
  const isEmpty =
    body === null ||
    body === undefined ||
    (typeof body === 'object' && !Array.isArray(body) && Object.keys(body as object).length === 0) ||
    body === '';

  const code = isEmpty ? '{}' : JSON.stringify(body, null, 2);

  return (
    <Highlight code={code} language="json" theme={JSON_THEME}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre className="m-0 whitespace-pre-wrap font-mono text-xs leading-[1.5]">
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, j) => (
                <span key={j} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}

function CurlRequest({ result }: { result: TestHttpEndpointResponse }) {
  const { url, method, headers = {}, body } = result.resolvedRequest;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildRawCurlString(url, method, headers, body));
      showToast({
        children: ({ close }) => (
          <>
            <ToastIcon variant="success" />
            <span>cURL command copied to clipboard</span>
            <ToastClose onClick={close} />
          </>
        ),
        options: { position: 'bottom-right' },
      });
    } catch {
      showErrorToast('Failed to copy cURL command');
    }
  }, [url, method, headers, body]);

  return (
    <BrowserShell
      className="rounded-tl-lg rounded-tr-lg rounded-bl-[4px] rounded-br-[4px]"
      actions={
        <>
          <button
            type="button"
            className="flex size-4 cursor-pointer items-center justify-center text-[#525866] hover:text-[#0e121b]"
          >
            <RiPlayCircleLine className="size-3" />
          </button>
          <button
            type="button"
            className="flex size-4 cursor-pointer items-center justify-center text-[#525866] hover:text-[#0e121b]"
            onClick={handleCopy}
          >
            <RiFileCopyLine className="size-3" />
          </button>
        </>
      }
    >
      <CurlDisplay url={url} method={method} headers={headers} body={body} />
    </BrowserShell>
  );
}

function ResponsePanel({ result, stepName }: { result: TestHttpEndpointResponse; stepName: string }) {
  const isSuccess = result.statusCode >= 200 && result.statusCode < 300;
  const isError = result.statusCode >= 400;
  const hasBody =
    result.body !== null &&
    result.body !== undefined &&
    !(
      typeof result.body === 'object' &&
      !Array.isArray(result.body) &&
      Object.keys(result.body as object).length === 0
    ) &&
    result.body !== '';

  const statusColor = isError ? '#fb3748' : '#1fc16b';
  const badgeBg = isError ? 'rgba(251,55,72,0.1)' : 'rgba(31,193,103,0.1)';
  const badgeLabel = isError ? 'FAILED' : 'SUCCESS';
  const statusText = getStatusText(result.statusCode);

  const handleCopyResponse = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(result.body, null, 2));
      showToast({
        children: ({ close }) => (
          <>
            <ToastIcon variant="success" />
            <span>Response copied to clipboard</span>
            <ToastClose onClick={close} />
          </>
        ),
        options: { position: 'bottom-right' },
      });
    } catch {
      showErrorToast('Failed to copy response');
    }
  }, [result.body]);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-clip rounded-bl-lg rounded-br-lg rounded-tl-[4px] rounded-tr-[4px] border border-[#e1e4ea]">
        <div className="flex items-center justify-between border-b border-[#e1e4ea] bg-[#fbfbfb] px-2 py-1.5 shadow-[0px_1px_0px_0px_#d2d2d2]">
          <div className="flex items-center gap-1">
            <span className="font-medium text-xs leading-4" style={{ color: statusColor }}>
              {result.statusCode} {statusText}
            </span>
            <div className="flex items-center rounded px-1 py-0.5" style={{ backgroundColor: badgeBg }}>
              <span
                className="font-mono font-medium text-xs leading-4 tracking-[-0.24px]"
                style={{ color: statusColor }}
              >
                {badgeLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs leading-[1.5] text-[#525866]">
              {'~ '}
              {result.statusCode} <span className="text-[#717784]">[{result.durationMs}ms]</span>
            </span>
            <button
              type="button"
              className="flex size-5 cursor-pointer items-center justify-center text-[#525866] hover:text-[#0e121b]"
              onClick={handleCopyResponse}
            >
              <RiFileCopyLine className="size-3" />
            </button>
          </div>
        </div>

        <div className="bg-white p-3">
          <JsonBody body={result.body} />
        </div>
      </div>

      {isSuccess && hasBody && (
        <div className="flex items-center gap-2 overflow-clip rounded-md border border-[#e1e4ea] bg-white p-2">
          <div className="flex h-full shrink-0 items-stretch">
            <div className="w-1 rounded-full bg-[#717784]" />
          </div>
          <p className="text-xs leading-4 text-[#525866]">
            <span className="font-medium text-[#0e121b]">Note: </span>
            {'These values can be accessed in the subsequent steps via '}
            <span className="font-mono font-medium tracking-[-0.24px]">{`{{${stepName}.`}</span>
          </p>
        </div>
      )}

      {isSuccess && !hasBody && (
        <div className="flex items-center gap-2 overflow-clip rounded-md border border-[#e1e4ea] bg-white p-2">
          <div className="flex h-full shrink-0 items-stretch">
            <div className="w-1 rounded-full bg-[#ff8447]" />
          </div>
          <p className="text-xs leading-4 text-[#0e121b]">No response body returned.</p>
        </div>
      )}
    </div>
  );
}

function getStatusText(statusCode: number): string {
  const STATUS_TEXTS: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };

  return STATUS_TEXTS[statusCode] ?? '';
}

function buildRawCurlString(
  url: string,
  method: string,
  headers: KeyValuePair[] | Record<string, string>,
  body: KeyValuePair[] | Record<string, unknown> | null | undefined
): string {
  const headerEntries: [string, string][] = Array.isArray(headers)
    ? headers.filter((h) => h.key).map((h) => [h.key, h.value])
    : Object.entries(headers ?? {});

  const headerArgs = headerEntries.map(([k, v]) => `--header '${k}: ${v}'`).join(' \\\n');

  const canHaveBody = method !== 'GET' && method !== 'DELETE';
  let bodyObj: Record<string, unknown> | null = null;

  if (canHaveBody) {
    if (Array.isArray(body)) {
      const pairs = body.filter((b) => b.key);
      if (pairs.length > 0) {
        bodyObj = Object.fromEntries(pairs.map(({ key, value }) => [key, value]));
      }
    } else if (body && Object.keys(body).length > 0) {
      bodyObj = body;
    }
  }

  const bodyStr = bodyObj ? `--data '${JSON.stringify(bodyObj)}'` : '';
  const parts = [`novu $ curl --location '${url}'`, headerArgs, bodyStr].filter(Boolean);

  return parts.join(' \\\n');
}

function buildLlmPrompt(url: string, method: string, headers: KeyValuePair[], body: KeyValuePair[]): string {
  const headerLines = headers
    .filter((h) => h.key)
    .map((h) => `  - ${h.key}: ${h.value}`)
    .join('\n');

  const bodyLines = body
    .filter((b) => b.key)
    .map((b) => `  - ${b.key}: ${b.value}`)
    .join('\n');

  return [
    `I need to implement a ${method} HTTP request to the following endpoint: ${url || '<url not set>'}`,
    headerLines ? `\nHeaders:\n${headerLines}` : '',
    bodyLines ? `\nBody fields:\n${bodyLines}` : '',
    '\nPlease help me write the code to call this API endpoint, handle the response, and manage any errors properly.',
  ]
    .filter(Boolean)
    .join('');
}

function PreTestState() {
  const { controlValues, editorValue } = useStepEditor();
  const { triggerTest, isTestPending } = useHttpRequestTest();

  const url = (controlValues?.url as string) ?? '';
  const method = (controlValues?.method as string) ?? 'GET';
  const headers = (controlValues?.headers as KeyValuePair[]) ?? [];
  const body = (controlValues?.body as KeyValuePair[]) ?? [];

  const curlString = buildRawCurlString(url, method, headers, body);
  const activeHeaders = headers.filter((h) => h.key);

  const handleCopyCurl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(curlString);
      showToast({
        children: ({ close }) => (
          <>
            <ToastIcon variant="success" />
            <span>cURL command copied to clipboard</span>
            <ToastClose onClick={close} />
          </>
        ),
        options: { position: 'bottom-right' },
      });
    } catch {
      showErrorToast('Failed to copy cURL command');
    }
  }, [curlString]);

  const handleCopyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildLlmPrompt(url, method, headers, body));
      showToast({
        children: ({ close }) => (
          <>
            <ToastIcon variant="success" />
            <span>Prompt copied to clipboard</span>
            <ToastClose onClick={close} />
          </>
        ),
        options: { position: 'bottom-right' },
      });
    } catch {
      showErrorToast('Failed to copy prompt');
    }
  }, [url, method, headers, body]);

  const handleTestEndpoint = useCallback(async () => {
    try {
      const previewPayload = parseJsonValue(editorValue);
      await triggerTest({ controlValues: controlValues as Record<string, unknown>, previewPayload });
      showToast({
        children: ({ close }) => (
          <>
            <ToastIcon variant="success" />
            <span>Endpoint test executed successfully</span>
            <ToastClose onClick={close} />
          </>
        ),
        options: { position: 'bottom-right' },
      });
    } catch {
      showErrorToast('Failed to execute endpoint test');
    }
  }, [controlValues, editorValue, triggerTest]);

  return (
    <div className="flex flex-col gap-3">
      <InlineToast
        variant="tip"
        title="Tip:"
        description="Use this pre-built prompt to let LLM implement this API faster."
        ctaLabel="Copy prompt"
        onCtaClick={handleCopyPrompt}
      />

      <div className="flex flex-col gap-[6px]">
        <BrowserShell
          actions={
            <>
              <button
                type="button"
                className="flex size-4 cursor-pointer items-center justify-center text-[#525866] hover:text-[#0e121b] disabled:opacity-50"
                onClick={handleTestEndpoint}
                disabled={isTestPending}
              >
                {isTestPending ? (
                  <RiLoader4Line className="size-3 animate-spin" />
                ) : (
                  <RiPlayCircleLine className="size-3" />
                )}
              </button>
              <button
                type="button"
                className="flex size-4 cursor-pointer items-center justify-center text-[#525866] hover:text-[#0e121b]"
                onClick={handleCopyCurl}
              >
                <RiFileCopyLine className="size-3" />
              </button>
            </>
          }
        >
          <CurlDisplay url={url} method={method} headers={activeHeaders} />
        </BrowserShell>

        <div className="flex items-center justify-between overflow-clip rounded-md border border-[#e1e4ea] bg-[#fbfbfb] px-2 py-1.5 shadow-[0px_1px_0px_0px_#d2d2d2]">
          <button
            type="button"
            className="flex cursor-pointer items-center gap-1 text-[#525866] hover:text-[#0e121b] disabled:opacity-50"
            onClick={handleTestEndpoint}
            disabled={isTestPending}
          >
            {isTestPending ? (
              <RiLoader4Line className="size-4 animate-spin" />
            ) : (
              <RiPlayCircleLine className="size-4" />
            )}
            <span className="font-medium text-xs leading-4">{isTestPending ? 'Testing...' : 'Test endpoint'}</span>
          </button>
          <button
            type="button"
            className="flex size-4 cursor-pointer items-center justify-center text-[#525866] hover:text-[#0e121b]"
            onClick={handleCopyCurl}
          >
            <RiFileCopyLine className="size-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
      <div className="flex flex-col gap-[6px] w-full animate-pulse">
        <div className="h-[120px] rounded-lg bg-[#f1f2f4]" />
        <div className="h-[80px] rounded-lg bg-[#f1f2f4]" />
      </div>
    </div>
  );
}

export function HttpRequestConsolePreview() {
  const { testResult, isTestPending } = useHttpRequestTest();
  const { step } = useStepEditor();

  if (isTestPending) {
    return <LoadingState />;
  }

  if (!testResult) {
    return <PreTestState />;
  }

  return (
    <div className="flex flex-col gap-[6px]">
      <CurlRequest result={testResult} />
      <ResponsePanel result={testResult} stepName={step.stepId} />
    </div>
  );
}
