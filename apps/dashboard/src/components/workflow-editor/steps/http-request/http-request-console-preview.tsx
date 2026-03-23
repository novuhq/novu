import { AnimatePresence, motion } from 'motion/react';
import { Highlight } from 'prism-react-renderer';
import { useCallback, useEffect, useRef } from 'react';
import { RiFileCopyLine, RiGlobalLine, RiLoader4Line, RiPlayCircleLine } from 'react-icons/ri';
import { NovuApiError } from '@/api/api.client';
import { type TestHttpEndpointResponse } from '@/api/steps';
import { InlineToast } from '@/components/primitives/inline-toast';
import { Skeleton } from '@/components/primitives/skeleton';
import { ToastClose, ToastIcon } from '@/components/primitives/sonner';
import { showErrorToast, showToast } from '@/components/primitives/sonner-helpers';
import { useStepEditor } from '../context/step-editor-context';
import { parseJsonValue } from '../utils/preview-context.utils';
import { CurlDisplay } from './curl-display';
import { buildRawCurlString, type KeyValuePair } from './curl-utils';
import { useCopyPrompt } from './use-copy-prompt';
import { useHttpRequestTest } from './use-http-request-test';

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

  const isPlainText = typeof body === 'string';
  const code = isEmpty ? '{}' : isPlainText ? (body as string) : JSON.stringify(body, null, 2);
  const language = isPlainText ? 'text' : 'json';

  return (
    <Highlight code={code} language={language} theme={JSON_THEME}>
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

function CurlRequest({
  result,
  onTest,
  isTestPending,
}: {
  result: TestHttpEndpointResponse;
  onTest: () => void;
  isTestPending: boolean;
}) {
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
            className="flex size-4 cursor-pointer items-center justify-center text-[#525866] hover:text-[#0e121b] disabled:opacity-50"
            onClick={onTest}
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
              <span className="text-[#717784]">[{result.durationMs}ms]</span>
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
    201: 'CREATED',
    204: 'NO CONTENT',
    400: 'BAD REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT FOUND',
    422: 'UNPROCESSABLE ENTITY',
    429: 'TOO MANY REQUESTS',
    500: 'INTERNAL SERVER ERROR',
    502: 'BAD GATEWAY',
    503: 'SERVICE UNAVAILABLE',
  };

  return STATUS_TEXTS[statusCode] ?? '';
}

function PreTestState({ novuSignature, onTest }: { novuSignature?: string; onTest: () => void }) {
  const { controlValues } = useStepEditor();
  const { isTestPending } = useHttpRequestTest();

  const url = (controlValues?.url as string) ?? '';
  const method = (controlValues?.method as string) ?? 'GET';
  const headers = (controlValues?.headers as KeyValuePair[]) ?? [];
  const body = (controlValues?.body as KeyValuePair[]) ?? [];

  const curlString = buildRawCurlString(url, method, headers, body, novuSignature);
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

  const handleCopyPrompt = useCopyPrompt();

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
                onClick={onTest}
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
          <CurlDisplay url={url} method={method} headers={activeHeaders} body={body} novuSignature={novuSignature} />
        </BrowserShell>

        <div className="flex items-center justify-between overflow-clip rounded-md border border-[#e1e4ea] bg-[#fbfbfb] px-2 py-1.5 shadow-[0px_1px_0px_0px_#d2d2d2]">
          <button
            type="button"
            className="flex cursor-pointer items-center gap-1 text-[#525866] hover:text-[#0e121b] disabled:opacity-50"
            onClick={onTest}
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
    <div className="flex flex-col gap-[6px] w-full">
      <Skeleton className="h-[120px] w-full rounded-lg" />
      <Skeleton className="h-[80px] w-full rounded-lg" />
    </div>
  );
}

function ErrorState({
  error,
  novuSignature,
  onTest,
  isTestPending,
}: {
  error: Error;
  novuSignature?: string;
  onTest: () => void;
  isTestPending: boolean;
}) {
  const { controlValues } = useStepEditor();

  const statusCode = error instanceof NovuApiError ? error.status : 500;
  const statusText = getStatusText(statusCode) || 'INTERNAL SERVER ERROR';
  const rawBody = error instanceof NovuApiError ? error.rawError : undefined;

  const url = (controlValues?.url as string) ?? '';
  const method = (controlValues?.method as string) ?? 'GET';
  const headers = ((controlValues?.headers as KeyValuePair[]) ?? []).filter((h) => h.key);
  const body = (controlValues?.body as KeyValuePair[]) ?? [];

  const curlString = buildRawCurlString(url, method, headers, body, novuSignature);

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

  const handleCopyResponse = useCallback(async () => {
    try {
      const content = rawBody ? JSON.stringify(rawBody, null, 2) : error.message;
      await navigator.clipboard.writeText(content);
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
  }, [rawBody, error.message]);

  return (
    <div className="flex flex-col gap-[6px]">
      <BrowserShell
        className="rounded-tl-lg rounded-tr-lg rounded-bl-[4px] rounded-br-[4px]"
        actions={
          <>
            <button
              type="button"
              className="flex size-4 cursor-pointer items-center justify-center text-[#525866] hover:text-[#0e121b] disabled:opacity-50"
              onClick={onTest}
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
        <CurlDisplay url={url} method={method} headers={headers} body={body} novuSignature={novuSignature} />
      </BrowserShell>

      <div className="flex flex-col gap-3">
        <div className="overflow-clip rounded-bl-lg rounded-br-lg rounded-tl-[4px] rounded-tr-[4px] border border-[#e1e4ea]">
          <div className="flex items-center justify-between border-b border-[#e1e4ea] bg-[#fbfbfb] px-2 py-1.5 shadow-[0px_1px_0px_0px_#d2d2d2]">
            <div className="flex items-center gap-1">
              <span className="font-medium text-xs leading-4 text-[#fb3748]">
                {statusCode} {statusText}
              </span>
              <div className="flex items-center rounded px-1 py-0.5 bg-[rgba(251,55,72,0.1)]">
                <span className="font-mono font-medium text-xs leading-4 tracking-[-0.24px] text-[#fb3748]">
                  FAILED
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs leading-[1.5] text-[#525866]">~ {statusCode}</span>
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
            <JsonBody body={rawBody ?? null} />
          </div>
        </div>
      </div>
    </div>
  );
}

const STATE_TRANSITION = { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const };

export function HttpRequestConsolePreview() {
  const { testResult, isTestPending, testError, triggerTest, resetTest } = useHttpRequestTest();
  const { step, previewData, controlValues, editorValue } = useStepEditor();
  const novuSignature = previewData?.novuSignature;

  const state = isTestPending ? 'loading' : testResult ? 'post-test' : testError ? 'error' : 'pre-test';

  const controlsKey = JSON.stringify({
    url: controlValues?.url,
    method: controlValues?.method,
    headers: controlValues?.headers,
    body: controlValues?.body,
  });
  const prevControlsKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevControlsKeyRef.current !== null && prevControlsKeyRef.current !== controlsKey) {
      resetTest();
    }

    prevControlsKeyRef.current = controlsKey;
  }, [controlsKey, resetTest]);

  const handleTestEndpoint = useCallback(async () => {
    try {
      const parsedPayload = parseJsonValue(editorValue);
      const previewPayload = {
        ...parsedPayload,
        context: Object.keys(parsedPayload.context).length > 0 ? parsedPayload.context : undefined,
      };
      const result = await triggerTest({ controlValues: controlValues as Record<string, unknown>, previewPayload });
      const isSuccessStatus = result && result.statusCode >= 200 && result.statusCode < 300;

      if (isSuccessStatus) {
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
      }
    } catch {
      showErrorToast('Failed to execute endpoint test');
    }
  }, [controlValues, editorValue, triggerTest]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {state === 'loading' && (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={STATE_TRANSITION}
        >
          <LoadingState />
        </motion.div>
      )}
      {state === 'pre-test' && (
        <motion.div
          key="pre-test"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={STATE_TRANSITION}
        >
          <PreTestState novuSignature={novuSignature} onTest={handleTestEndpoint} />
        </motion.div>
      )}
      {state === 'error' && testError && (
        <motion.div
          key="error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={STATE_TRANSITION}
        >
          <ErrorState
            error={testError}
            novuSignature={novuSignature}
            onTest={handleTestEndpoint}
            isTestPending={isTestPending}
          />
        </motion.div>
      )}
      {state === 'post-test' && testResult && (
        <motion.div
          key="post-test"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={STATE_TRANSITION}
          className="flex flex-col gap-[6px]"
        >
          <CurlRequest result={testResult} onTest={handleTestEndpoint} isTestPending={isTestPending} />
          <ResponsePanel result={testResult} stepName={step.stepId} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
