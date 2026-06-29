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
      const service = new BridgeExecutorService({} as any, logger as any, attachmentStorage as any, {} as any);

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
      const service = new BridgeExecutorService({} as any, logger as any, attachmentStorage as any, {} as any);

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

    it('should omit malformed attachment entries without throwing', async () => {
      const logger = makeLogger();
      const attachmentStorage = {
        signRead: sinon.stub().resolves('https://signed/read'),
      };
      const service = new BridgeExecutorService({} as any, logger as any, attachmentStorage as any, {} as any);

      const result = await (service as any).mapRichContentForBridge(
        {
          attachments: [null, 'bad-entry'],
        },
        makeActivity()
      );

      expect(result).to.deep.equal({ attachments: [] });
      expect(attachmentStorage.signRead.called).to.equal(false);
      expect(logger.warn.callCount).to.equal(2);
    });

    it('should limit concurrent history attachment signing', async () => {
      let active = 0;
      let maxActive = 0;
      const logger = makeLogger();
      const attachmentStorage = {
        signRead: sinon.stub().callsFake(async () => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          await new Promise((resolve) => setTimeout(resolve, 5));
          active -= 1;

          return 'https://signed/read';
        }),
      };
      const service = new BridgeExecutorService({} as any, logger as any, attachmentStorage as any, {} as any);

      await (service as any).mapRichContentForBridge(
        {
          attachments: Array.from({ length: 10 }, (_, index) => ({
            type: 'image',
            storageKey: `org/env/agents/conv/message/${index}-image.png`,
          })),
        },
        makeActivity()
      );

      expect(maxActive).to.be.at.most(4);
      expect(attachmentStorage.signRead.callCount).to.equal(10);
    });

    it('should not multiply attachment signing concurrency across history entries', async () => {
      let active = 0;
      let maxActive = 0;
      const logger = makeLogger();
      const attachmentStorage = {
        signRead: sinon.stub().callsFake(async () => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          await new Promise((resolve) => setTimeout(resolve, 5));
          active -= 1;

          return 'https://signed/read';
        }),
      };
      const service = new BridgeExecutorService({} as any, logger as any, attachmentStorage as any, {} as any);

      await (service as any).mapHistory([
        makeActivity({
          _id: 'activity-1',
          richContent: {
            attachments: Array.from({ length: 10 }, (_, index) => ({
              type: 'image',
              storageKey: `org/env/agents/conv/message-a/${index}-image.png`,
            })),
          },
        }),
        makeActivity({
          _id: 'activity-2',
          richContent: {
            attachments: Array.from({ length: 10 }, (_, index) => ({
              type: 'image',
              storageKey: `org/env/agents/conv/message-b/${index}-image.png`,
            })),
          },
        }),
      ]);

      expect(maxActive).to.be.at.most(4);
      expect(attachmentStorage.signRead.callCount).to.equal(20);
    });
  });

  describe('mapMessage', () => {
    it('should re-sign stored attachments instead of reusing stored urls', async () => {
      const logger = makeLogger();
      const attachmentStorage = {
        signRead: sinon.stub().resolves('https://fresh-signed/read'),
      };
      const service = new BridgeExecutorService({} as any, logger as any, attachmentStorage as any, {} as any);

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
      const service = new BridgeExecutorService({} as any, logger as any, attachmentStorage as any, {} as any);

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

    it('should limit concurrent stored attachment signing', async () => {
      let active = 0;
      let maxActive = 0;
      const logger = makeLogger();
      const attachmentStorage = {
        signRead: sinon.stub().callsFake(async () => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          await new Promise((resolve) => setTimeout(resolve, 5));
          active -= 1;

          return 'https://fresh-signed/read';
        }),
      };
      const service = new BridgeExecutorService({} as any, logger as any, attachmentStorage as any, {} as any);

      const result = await (service as any).mapMessage(
        makeMessage(),
        Array.from({ length: 10 }, (_, index) => ({
          type: 'image',
          storageKey: `org/env/agents/conv/message/${index}-image.png`,
        })),
        {
          organizationId: 'org',
          environmentId: 'env',
          conversationId: 'conv',
        }
      );

      expect(result.attachments).to.have.length(10);
      expect(maxActive).to.be.at.most(4);
      expect(attachmentStorage.signRead.callCount).to.equal(10);
    });
  });
});
