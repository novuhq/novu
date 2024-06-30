import { expect, it, describe, beforeEach, vi } from 'vitest';
import { Novu } from '@novu/api';

import { Client } from './client';
import { NovuRequestHandler } from './handler';

describe('NovuRequestHandler', () => {
  let client: Client;
  let httpClientMock: any;

  beforeEach(() => {
    client = new Client({ secretKey: 'some-secret-key' });

    (client as any).httpClient = httpClientMock;
  });

  describe('triggerAction', () => {
    it('should call Novu.trigger when triggerAction is invoked', async () => {
      const handlerOptions = {
        frameworkName: 'test-framework',
        workflows: [],
        handler: vi.fn(),
        client,
      };

      const requestHandler = new NovuRequestHandler(handlerOptions);

      const triggerMock = vi.spyOn(Novu.prototype, 'trigger').mockResolvedValue({
        transactionId: 'test-transaction',
        acknowledged: true,
        status: 'processed',
      });

      const testEvent = {
        name: 'test-workflow',
        to: ['test@example.com'],
        payload: {},
        bridgeUrl: 'http://example.com',
      };

      await requestHandler.triggerAction(testEvent)();

      expect(triggerMock).toHaveBeenCalledWith(testEvent);
    });
  });
});
