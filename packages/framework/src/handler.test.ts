import { expect, it, describe, beforeEach, vi } from 'vitest';

import { Client } from './client';
import { NovuRequestHandler } from './handler';

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
});
