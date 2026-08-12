import { FeatureFlagsService } from '@novu/application-generic';
import { AgentEventEnum } from '@novu/framework/internal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
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

  function makeFeatureFlagsService(isEventProtocolEnabled = false) {
    return {
      getFlag: sinon.stub().callsFake(async ({ key }: { key: string }) => {
        if (key === FeatureFlagsKeysEnum.IS_AGENT_EVENT_PROTOCOL_ENABLED) {
          return isEventProtocolEnabled;
        }

        return false;
      }),
    };
  }

  function makeService(
    overrides: { isEventProtocolEnabled?: boolean; attachmentStorage?: Record<string, unknown> } = {}
  ) {
    const logger = makeLogger();
    const attachmentStorage = overrides.attachmentStorage ?? { signRead: sinon.stub().resolves('https://signed/read') };
    const activityLedger = { listForView: sinon.stub().resolves({ data: [], hasMore: false }) };
    const featureFlagsService = makeFeatureFlagsService(overrides.isEventProtocolEnabled);

    const service = new BridgeExecutorService(
      {} as any,
      logger as any,
      attachmentStorage as any,
      activityLedger as any,
      featureFlagsService as unknown as FeatureFlagsService
    );

    return { service, logger, attachmentStorage, activityLedger, featureFlagsService };
  }

  function makeExecutionParams() {
    return {
      event: AgentEventEnum.ON_MESSAGE,
      config: {
        agentIdentifier: 'agent-1',
        organizationId: 'org-1',
        environmentId: 'env-1',
        integrationIdentifier: 'integration-1',
        platform: 'slack',
      },
      conversation: {
        _id: 'conv-1',
        identifier: 'conv-identifier',
        status: 'active',
        metadata: {},
        messageCount: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        lastActivityAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      subscriber: null,
      message: null,
      platformContext: {},
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

  describe('resolveBridgeUrl', () => {
    function resolve(
      config: Record<string, unknown>,
      bridgeUrlOverride?: string
    ): { url: string | null; logger: ReturnType<typeof makeLogger> } {
      const { service, logger } = makeService();
      const url = (service as any).resolveBridgeUrl(config, 'agent-1', AgentEventEnum.ON_MESSAGE, bridgeUrlOverride);

      return { url, logger };
    }

    it('uses the agent default bridge URL when no override or dev bridge is set', () => {
      const { url } = resolve({ bridgeUrl: 'https://agent-default.example.com/api/novu' });

      expect(url).to.be.a('string');
      const parsed = new URL(url as string);
      expect(parsed.origin + parsed.pathname).to.equal('https://agent-default.example.com/api/novu');
      expect(parsed.searchParams.get('action')).to.equal('agent-event');
      expect(parsed.searchParams.get('agentId')).to.equal('agent-1');
    });

    it('prefers the per-context override over the agent default', () => {
      const { url, logger } = resolve(
        { bridgeUrl: 'https://agent-default.example.com/api/novu' },
        'https://tenant-acme.example.com/api/novu'
      );

      expect(new URL(url as string).host).to.equal('tenant-acme.example.com');
      expect(logger.info.calledOnce, 'logs when an override is applied').to.equal(true);
    });

    it('prefers the active dev bridge over the context override', () => {
      const { url } = resolve(
        {
          bridgeUrl: 'https://agent-default.example.com/api/novu',
          devBridgeActive: true,
          devBridgeUrl: 'https://dev.example.com/api/novu',
        },
        'https://tenant-acme.example.com/api/novu'
      );

      expect(new URL(url as string).host).to.equal('dev.example.com');
    });

    it('falls back to the context override when a dev bridge URL exists but is inactive', () => {
      const { url } = resolve(
        {
          bridgeUrl: 'https://agent-default.example.com/api/novu',
          devBridgeActive: false,
          devBridgeUrl: 'https://dev.example.com/api/novu',
        },
        'https://tenant-acme.example.com/api/novu'
      );

      expect(new URL(url as string).host).to.equal('tenant-acme.example.com');
    });

    it('returns null when neither an override nor an agent bridge URL is configured', () => {
      const { url, logger } = resolve({});

      expect(url).to.equal(null);
      expect(logger.warn.calledOnce).to.equal(true);
    });
  });

  describe('buildPayload', () => {
    it('should include eventsUrl when the agent event protocol flag is enabled', async () => {
      const { service, featureFlagsService } = makeService({ isEventProtocolEnabled: true });

      const payload = await (service as any).buildPayload(makeExecutionParams());

      expect(payload.eventsUrl).to.match(/\/v1\/agents\/events\/ingest$/);
      expect(payload.replyUrl).to.match(/\/v1\/agents\/agent-1\/reply$/);
      expect(payload.eventsUrl?.replace(/\/v1\/agents\/events\/ingest$/, '')).to.equal(
        payload.replyUrl.replace(/\/v1\/agents\/agent-1\/reply$/, '')
      );
      expect(featureFlagsService.getFlag.calledOnce).to.equal(true);
    });

    it('should omit eventsUrl when the agent event protocol flag is disabled', async () => {
      const { service } = makeService({ isEventProtocolEnabled: false });

      const payload = await (service as any).buildPayload(makeExecutionParams());

      expect(payload).to.not.have.property('eventsUrl');
      expect(payload.replyUrl).to.match(/\/v1\/agents\/agent-1\/reply$/);
    });
  });

  describe('mapRichContentForBridge', () => {
    it('should omit an attachment when signing fails without throwing', async () => {
      const { service, logger } = makeService({
        attachmentStorage: { signRead: sinon.stub().rejects(new Error('storage unavailable')) },
      });

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
      const { service, logger, attachmentStorage } = makeService();

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
      const { service, logger, attachmentStorage } = makeService();

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
      const { service, attachmentStorage } = makeService({
        attachmentStorage: {
          signRead: sinon.stub().callsFake(async () => {
            active += 1;
            maxActive = Math.max(maxActive, active);
            await new Promise((resolve) => setTimeout(resolve, 5));
            active -= 1;

            return 'https://signed/read';
          }),
        },
      });

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
      const { service, attachmentStorage } = makeService({
        attachmentStorage: {
          signRead: sinon.stub().callsFake(async () => {
            active += 1;
            maxActive = Math.max(maxActive, active);
            await new Promise((resolve) => setTimeout(resolve, 5));
            active -= 1;

            return 'https://signed/read';
          }),
        },
      });

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
      const { service, attachmentStorage } = makeService({
        attachmentStorage: { signRead: sinon.stub().resolves('https://fresh-signed/read') },
      });

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
      const { service, logger } = makeService({
        attachmentStorage: { signRead: sinon.stub().rejects(new Error('sign failed')) },
      });

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
      const { service, attachmentStorage } = makeService({
        attachmentStorage: {
          signRead: sinon.stub().callsFake(async () => {
            active += 1;
            maxActive = Math.max(maxActive, active);
            await new Promise((resolve) => setTimeout(resolve, 5));
            active -= 1;

            return 'https://fresh-signed/read';
          }),
        },
      });

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
