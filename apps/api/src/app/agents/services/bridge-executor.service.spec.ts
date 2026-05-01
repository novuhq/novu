import { expect } from 'chai';
import sinon from 'sinon';
import { BridgeExecutorService } from './bridge-executor.service';

describe('BridgeExecutorService', () => {
  function makeActivity(overrides: Record<string, unknown> = {}) {
    return {
      _id: 'activity-id',
      _organizationId: 'org',
      _environmentId: 'env',
      _conversationId: 'conv',
      ...overrides,
    };
  }

  describe('mapRichContentForBridge', () => {
    it('should omit an attachment when signing fails without throwing', async () => {
      const logger = {
        warn: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
        info: sinon.stub(),
        setContext: sinon.stub(),
      };
      const attachmentStorage = {
        signRead: sinon.stub().rejects(new Error('storage unavailable')),
      };
      const service = new BridgeExecutorService({} as any, logger as any, attachmentStorage as any);

      const result = await (service as any).mapRichContentForBridge(
        {
          attachments: [
            {
              type: 'image',
              storageKey: 'org/env/agents/conv/message/0-image.png',
              name: 'image.png',
              mimeType: 'image/png',
              size: 123,
            },
          ],
        },
        makeActivity()
      );

      expect(result).to.deep.equal({ attachments: [] });
      expect(logger.warn.calledOnce).to.equal(true);
    });

    it('should omit an attachment when storageKey is outside the activity namespace', async () => {
      const logger = {
        warn: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
        info: sinon.stub(),
        setContext: sinon.stub(),
      };
      const attachmentStorage = {
        signRead: sinon.stub().resolves('https://signed/read'),
      };
      const service = new BridgeExecutorService({} as any, logger as any, attachmentStorage as any);

      const result = await (service as any).mapRichContentForBridge(
        {
          attachments: [
            {
              type: 'image',
              storageKey: 'other-org/env/agents/conv/message/0-image.png',
              name: 'image.png',
              mimeType: 'image/png',
              size: 123,
            },
          ],
        },
        makeActivity()
      );

      expect(result).to.deep.equal({ attachments: [] });
      expect(attachmentStorage.signRead.called).to.equal(false);
      expect(logger.warn.calledWithMatch({ expectedPrefix: 'org/env/agents/conv/' })).to.equal(true);
    });
  });
});
