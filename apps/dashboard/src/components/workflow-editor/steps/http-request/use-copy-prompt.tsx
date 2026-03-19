import { useCallback } from 'react';
import { ToastClose, ToastIcon } from '@/components/primitives/sonner';
import { showErrorToast, showToast } from '@/components/primitives/sonner-helpers';
import { useStepEditor } from '../context/step-editor-context';
import { canMethodHaveBody, type KeyValuePair } from './curl-utils';

function buildLlmPrompt(
  url: string,
  method: string,
  headers: KeyValuePair[],
  body: KeyValuePair[],
  responseBodySchema?: Record<string, unknown> | null,
  enforceSchemaValidation?: boolean
): string {
  const activeHeaders = headers.filter((h) => h.key);
  const activeBody = body.filter((b) => b.key);

  const headersBlock =
    activeHeaders.length > 0
      ? activeHeaders.map((h) => `  ${h.key}: ${h.value}`).join('\n') +
        '\n  novu-signature: t=<timestamp>,v1=<hmac-sha256>'
      : '  novu-signature: t=<timestamp>,v1=<hmac-sha256>';

  const canHaveBody = canMethodHaveBody(method);
  const bodyObject =
    canHaveBody && activeBody.length > 0 ? Object.fromEntries(activeBody.map(({ key, value }) => [key, value])) : null;

  const bodyBlock = bodyObject ? `\nBody (JSON):\n${JSON.stringify(bodyObject, null, 2)}` : '';

  const hasSchemaProperties =
    responseBodySchema &&
    typeof responseBodySchema === 'object' &&
    'properties' in responseBodySchema &&
    Object.keys((responseBodySchema as { properties: Record<string, unknown> }).properties ?? {}).length > 0;

  const schemaSection = hasSchemaProperties
    ? [
        '\n## Expected response\n',
        'My endpoint must return a JSON response conforming to this schema:',
        '```json',
        JSON.stringify(responseBodySchema, null, 2),
        '```',
        enforceSchemaValidation
          ? 'Schema validation is enforced — a non-conforming response will fail the workflow step.'
          : 'Schema validation is not enforced but the response should still match this shape for use in subsequent steps.',
      ].join('\n')
    : '';

  return `I need to implement an HTTP endpoint that will be called by Novu's notification workflow engine.

## Request my endpoint will receive

Method: ${method}
URL: ${url || '<url not set>'}

Headers:
${headersBlock}${bodyBlock}

## Signature verification

Every request from Novu includes a \`novu-signature\` header to prove authenticity.
Format: \`t=<timestamp>,v1=<signature>\`

To verify:
1. Parse the header: split on \`,\`, extract \`t\` (timestamp) and \`v1\` (HMAC)
2. Build the signed string: \`\${timestamp}.\${JSON.stringify(requestBody)}\`
3. Compute HMAC-SHA256 of that string using your Novu secret key
4. Compare (constant-time) your computed HMAC against the \`v1\` value
5. Optionally reject requests where the timestamp is more than 5 minutes old${schemaSection}

## What to generate

Please write a complete endpoint handler (Node.js/Express by default, or specify your framework) that:
1. Accepts the ${method} request described above
2. Reads the raw request body and verifies the \`novu-signature\` header
3. Parses the JSON body and extracts relevant fields
4. Implements placeholder business logic
5. Returns a 200 JSON response${hasSchemaProperties ? ' matching the schema above' : ''}`;
}

export function useCopyPrompt() {
  const { controlValues } = useStepEditor();

  const url = (controlValues?.url as string) ?? '';
  const method = (controlValues?.method as string) ?? 'GET';
  const headers = (controlValues?.headers as KeyValuePair[]) ?? [];
  const body = (controlValues?.body as KeyValuePair[]) ?? [];
  const responseBodySchema = (controlValues?.responseBodySchema as Record<string, unknown>) ?? null;
  const enforceSchemaValidation = (controlValues?.enforceSchemaValidation as boolean) ?? false;

  return useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        buildLlmPrompt(url, method, headers, body, responseBodySchema, enforceSchemaValidation)
      );
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
  }, [url, method, headers, body, responseBodySchema, enforceSchemaValidation]);
}
