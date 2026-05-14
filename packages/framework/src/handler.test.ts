import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Client } from './client';
import {
  ErrorCodeEnum,
  GetActionEnum,
  HttpHeaderKeysEnum,
  HttpQueryKeysEnum,
  HttpStatusEnum,
  PostActionEnum,
  SIGNATURE_TIMESTAMP_TOLERANCE,
} from './constants';
import { type IActionResponse, type INovuRequestHandlerOptions, NovuRequestHandler } from './handler';
import { timingSafeEqual } from './utils';

describe('NovuRequestHandler', () => {
  let client: Client;

  beforeEach(() => {
    client = new Client({ secretKey: 'some-secret-key' });
  });

  describe('triggerAction', () => {
    it('should call global.fetch when triggerAction is invoked', async () => {
      const handlerOptions = {
        frameworkName: 'test-framework',
        workflows: [],
        handler: vi.fn(),
        client,
      };

      const requestHandler = new NovuRequestHandler(handlerOptions);

      const triggerEvent = {
        workflowId: 'test-workflow',
        to: 'test@example.com',
        payload: {},
        transactionId: 'test-transaction',
        overrides: {},
        actor: undefined,
        tenant: undefined,
        bridgeUrl: 'http://example.com',
      };

      const { workflowId, ...renamedWorkflowId } = { ...triggerEvent, name: triggerEvent.workflowId };

      const postMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => {
          return Promise.resolve({ test: 'ok' });
        },
      });
      global.fetch = postMock;

      await requestHandler.triggerAction(triggerEvent)();

      const expectedBody = renamedWorkflowId;
      const expectedHeaders = {
        Authorization: 'ApiKey some-secret-key',
        'Content-Type': 'application/json',
      };
      const expectedMethod = 'POST';
      const expectedPayload = { body: expectedBody, headers: expectedHeaders, method: expectedMethod };

      const calledWithUrl = postMock.mock.calls[0][0];
      expect(calledWithUrl).toEqual('https://api.novu.co/v1/events/trigger');

      const calledWithBody = postMock.mock.calls[0][1].body;
      // we parse the body in order to compare the objects with more predictable results versus strings
      const parsedCalledBody = JSON.parse(calledWithBody);
      expect(parsedCalledBody).toEqual(expectedPayload.body);

      const calledWithMethod = postMock.mock.calls[0][1].method;
      expect(calledWithMethod).toEqual(expectedPayload.method);

      const calledWithHeaders = postMock.mock.calls[0][1].headers;
      expect(calledWithHeaders).toEqual(expectedPayload.headers);
    });
  });

  describe('validateHmac', () => {
    const SECRET_KEY = 'super-secret-key-for-hmac-tests';

    function buildSignatureHeader(secretKey: string, payload: unknown, timestamp: number): string {
      const signedString = `${timestamp}.${JSON.stringify(payload)}`;
      const hmac = createHmac('sha256', secretKey).update(signedString).digest('hex');

      return `t=${timestamp},v1=${hmac}`;
    }

    /**
     * Build a `NovuRequestHandler` whose mock framework adapter returns the
     * provided POST body and `Novu-Signature` header. Discovery is invoked to
     * exercise the HMAC validation path without needing a registered workflow.
     */
    function buildHandler({
      payload,
      signatureHeader,
      action = PostActionEnum.EXECUTE,
      method = 'POST',
    }: {
      payload: unknown;
      signatureHeader: string | null;
      action?: PostActionEnum | GetActionEnum;
      method?: 'POST' | 'GET';
    }) {
      const strictClient = new Client({ secretKey: SECRET_KEY, strictAuthentication: true });

      // Stub the protected execute path so a successful HMAC reaches a known
      // 200 OK response without needing to register a real workflow.
      vi.spyOn(strictClient, 'executeWorkflow').mockResolvedValue({ ok: true } as never);

      const options: INovuRequestHandlerOptions = {
        frameworkName: 'test-framework',
        client: strictClient,
        workflows: [],
        handler: () => ({
          body: () => payload,
          headers: (key: string) => {
            if (key === HttpHeaderKeysEnum.NOVU_SIGNATURE) return signatureHeader;

            return null;
          },
          method: () => method,
          url: () => {
            const url = new URL('http://localhost/api/novu');
            url.searchParams.set(HttpQueryKeysEnum.ACTION, action);
            url.searchParams.set(HttpQueryKeysEnum.WORKFLOW_ID, 'test-workflow');
            url.searchParams.set(HttpQueryKeysEnum.STEP_ID, 'test-step');

            return url;
          },
          transformResponse: (res: IActionResponse<string>) => res,
        }),
      };

      return new NovuRequestHandler(options).createHandler();
    }

    function parseResponse(res: IActionResponse<string>) {
      return { status: res.status, body: JSON.parse(res.body) as { code?: string; message?: string } };
    }

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('accepts a freshly signed request', async () => {
      const payload = { workflowId: 'test-workflow', stepId: 'test-step', inputs: {}, controls: {}, state: [] };
      const now = 1_700_000_000_000;
      vi.useFakeTimers().setSystemTime(now);

      const header = buildSignatureHeader(SECRET_KEY, payload, now);
      const handler = buildHandler({ payload, signatureHeader: header });

      const response = parseResponse(await handler());

      expect(response.status).toBe(HttpStatusEnum.OK);
    });

    it('rejects a request whose signature is older than the tolerance window (the original replay bug)', async () => {
      const payload = { workflowId: 'test-workflow' };
      const signedAt = 1_700_000_000_000;
      const header = buildSignatureHeader(SECRET_KEY, payload, signedAt);

      // Advance system clock well past the tolerance window so the captured
      // signature should be considered expired.
      vi.useFakeTimers().setSystemTime(signedAt + SIGNATURE_TIMESTAMP_TOLERANCE + 1_000);

      const handler = buildHandler({ payload, signatureHeader: header });
      const response = parseResponse(await handler());

      expect(response.status).toBe(HttpStatusEnum.UNAUTHORIZED);
      expect(response.body.code).toBe(ErrorCodeEnum.SIGNATURE_EXPIRED_ERROR);
    });

    it('rejects a request whose timestamp is too far in the future', async () => {
      const payload = { workflowId: 'test-workflow' };
      const now = 1_700_000_000_000;
      vi.useFakeTimers().setSystemTime(now);

      const header = buildSignatureHeader(SECRET_KEY, payload, now + SIGNATURE_TIMESTAMP_TOLERANCE + 1_000);
      const handler = buildHandler({ payload, signatureHeader: header });

      const response = parseResponse(await handler());

      expect(response.status).toBe(HttpStatusEnum.UNAUTHORIZED);
      expect(response.body.code).toBe(ErrorCodeEnum.SIGNATURE_EXPIRED_ERROR);
    });

    it('accepts a timestamp within a small future skew', async () => {
      const payload = { workflowId: 'test-workflow' };
      const now = 1_700_000_000_000;
      vi.useFakeTimers().setSystemTime(now);

      // Signed 30s in the future — within tolerance — should still be accepted.
      const header = buildSignatureHeader(SECRET_KEY, payload, now + 30_000);
      const handler = buildHandler({ payload, signatureHeader: header });

      const response = parseResponse(await handler());

      expect(response.status).toBe(HttpStatusEnum.OK);
    });

    it('rejects a header missing the `t` field', async () => {
      const payload = { workflowId: 'test-workflow' };
      const handler = buildHandler({
        payload,
        signatureHeader: 'v1=deadbeef',
      });

      const response = parseResponse(await handler());

      expect(response.status).toBe(HttpStatusEnum.UNAUTHORIZED);
      expect(response.body.code).toBe(ErrorCodeEnum.SIGNATURE_INVALID_ERROR);
    });

    it('rejects a header missing the `v1` field', async () => {
      const payload = { workflowId: 'test-workflow' };
      const handler = buildHandler({
        payload,
        signatureHeader: `t=${Date.now()}`,
      });

      const response = parseResponse(await handler());

      expect(response.status).toBe(HttpStatusEnum.UNAUTHORIZED);
      expect(response.body.code).toBe(ErrorCodeEnum.SIGNATURE_INVALID_ERROR);
    });

    it('rejects a header whose timestamp is non-numeric', async () => {
      const payload = { workflowId: 'test-workflow' };
      const handler = buildHandler({
        payload,
        signatureHeader: 't=not-a-number,v1=deadbeef',
      });

      const response = parseResponse(await handler());

      expect(response.status).toBe(HttpStatusEnum.UNAUTHORIZED);
      expect(response.body.code).toBe(ErrorCodeEnum.SIGNATURE_INVALID_ERROR);
    });

    it('rejects a request whose signature value does not match', async () => {
      const payload = { workflowId: 'test-workflow' };
      const now = 1_700_000_000_000;
      vi.useFakeTimers().setSystemTime(now);

      const handler = buildHandler({
        payload,
        signatureHeader: `t=${now},v1=00000000000000000000000000000000`,
      });

      const response = parseResponse(await handler());

      expect(response.status).toBe(HttpStatusEnum.UNAUTHORIZED);
      expect(response.body.code).toBe(ErrorCodeEnum.SIGNATURE_MISMATCH_ERROR);
    });

    it('rejects a request whose body has been tampered after signing', async () => {
      const originalPayload = { workflowId: 'test-workflow', amount: 1 };
      const tamperedPayload = { workflowId: 'test-workflow', amount: 9999 };
      const now = 1_700_000_000_000;
      vi.useFakeTimers().setSystemTime(now);

      const headerForOriginal = buildSignatureHeader(SECRET_KEY, originalPayload, now);
      const handler = buildHandler({
        payload: tamperedPayload,
        signatureHeader: headerForOriginal,
      });

      const response = parseResponse(await handler());

      expect(response.status).toBe(HttpStatusEnum.UNAUTHORIZED);
      expect(response.body.code).toBe(ErrorCodeEnum.SIGNATURE_MISMATCH_ERROR);
    });

    it('rejects a request that has no signature header at all', async () => {
      const payload = { workflowId: 'test-workflow' };
      const handler = buildHandler({ payload, signatureHeader: null });

      const response = parseResponse(await handler());

      expect(response.status).toBe(HttpStatusEnum.UNAUTHORIZED);
      expect(response.body.code).toBe(ErrorCodeEnum.SIGNATURE_NOT_FOUND_ERROR);
    });

    it('skips HMAC validation for the unauthenticated health check action', async () => {
      const handler = buildHandler({
        payload: {},
        signatureHeader: null,
        action: GetActionEnum.HEALTH_CHECK,
        method: 'GET',
      });

      const response = parseResponse(await handler());

      expect(response.status).toBe(HttpStatusEnum.OK);
    });

    it('parses headers with whitespace and reordered fields', async () => {
      const payload = { workflowId: 'test-workflow' };
      const now = 1_700_000_000_000;
      vi.useFakeTimers().setSystemTime(now);

      const expected = createHmac('sha256', SECRET_KEY)
        .update(`${now}.${JSON.stringify(payload)}`)
        .digest('hex');

      const handler = buildHandler({
        payload,
        signatureHeader: ` v1=${expected} , t=${now} `,
      });

      const response = parseResponse(await handler());

      expect(response.status).toBe(HttpStatusEnum.OK);
    });
  });

  describe('timingSafeEqual', () => {
    it('returns true for identical strings', () => {
      expect(timingSafeEqual('deadbeef', 'deadbeef')).toBe(true);
    });

    it('returns false for strings of different length', () => {
      expect(timingSafeEqual('deadbeef', 'deadbeefdeadbeef')).toBe(false);
    });

    it('returns false for strings of equal length that differ', () => {
      expect(timingSafeEqual('deadbeef', 'deadbeee')).toBe(false);
    });

    it('returns false for non-string inputs', () => {
      // @ts-expect-error - intentionally invalid input
      expect(timingSafeEqual(undefined, 'deadbeef')).toBe(false);
    });
  });
});
