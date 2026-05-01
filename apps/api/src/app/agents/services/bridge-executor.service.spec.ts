import { expect } from 'chai';
import sinon from 'sinon';
import { BridgeExecutorService } from './bridge-executor.service';

describe('BridgeExecutorService', () => {
  function makeLogger() {
    return {
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
      setContext: sinon.stub(),
    };
  }

  function makeActivity(overrides: Record<string, unknown> = {}) {
    return {
      _id: 'activity-id',
      _organizationId: 'org',
      _environmentId: 'env',
      _conversationId: 'conv',
      ...overrides,
    };
  }

  function makeMessage() {
    return {
      id: 'message-id',
      text: 'hello',
      author: {
        userId: 'user-id',
        fullName: 'User',
        userName: 'user',
        isBot: false,
      },
      metadata: {
        dateSent: new Date('2026-01-01T00:00:00.000Z'),
      },
    };
  }

  describe('mapRichContentForBridge', () => {
    it('should omit an attachment when signing fails without throwing', async () => {
      const logger = makeLogger();
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
      const logger = makeLogger();
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

  describe('mapMessage', () => {
    it('should re-sign stored attachments instead of reusing stored urls', async () => {
      const logger = makeLogger();
      const attachmentStorage = {
        signRead: sinon.stub().resolves('https://fresh-signed/read'),
      };
      const service = new BridgeExecutorService({} as any, logger as any, attachmentStorage as any);

      const result = await (service as any).mapMessage(
        makeMessage(),
        [
          {
            type: 'image',
            storageKey: 'org/env/agents/conv/message/0-image.png',
            url: 'https://stale-signed/read',
            name: 'image.png',
            mimeType: 'image/png',
            size: 123,
          },
        ],
        {
          organizationId: 'org',
          environmentId: 'env',
          conversationId: 'conv',
        }
      );

      expect(result.attachments).to.deep.equal([
        {
          type: 'image',
          url: 'https://fresh-signed/read',
          name: 'image.png',
          mimeType: 'image/png',
          size: 123,
        },
      ]);
      expect(attachmentStorage.signRead.calledOnceWithExactly('org/env/agents/conv/message/0-image.png')).to.equal(
        true
      );
    });

    it('should omit stored attachments that cannot be signed', async () => {
      const logger = makeLogger();
      const attachmentStorage = {
        signRead: sinon.stub().rejects(new Error('sign failed')),
      };
      const service = new BridgeExecutorService({} as any, logger as any, attachmentStorage as any);

      const result = await (service as any).mapMessage(
        makeMessage(),
        [
          {
            type: 'image',
            storageKey: 'org/env/agents/conv/message/0-image.png',
            url: 'https://stale-signed/read',
          },
        ],
        {
          organizationId: 'org',
          environmentId: 'env',
          conversationId: 'conv',
        }
      );

      expect(result.attachments).to.deep.equal([]);
      expect(logger.warn.calledOnce).to.equal(true);
    });
  });
});
