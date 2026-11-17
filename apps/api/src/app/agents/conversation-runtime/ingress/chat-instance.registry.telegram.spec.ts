import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { ChatInstanceRegistry } from './chat-instance.registry';

interface TelegramUnderTest {
  longMessages: string;
  sleep: (ms: number) => Promise<void>;
  postMessage: (threadId: string, message: unknown) => Promise<unknown>;
}

describe('ChatInstanceRegistry Telegram adapter', () => {
  const logger = { setContext: () => undefined };

  function registry(): ChatInstanceRegistry {
    return new ChatInstanceRegistry(
      logger as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    );
  }

  async function telegramAdapter() {
    const built = registry() as unknown as {
      buildAdapters: (
        agentId: string,
        platform: AgentPlatformEnum,
        cached: unknown
      ) => Promise<{ telegram: TelegramUnderTest }>;
    };
    const adapters = await built.buildAdapters('agent-1', AgentPlatformEnum.TELEGRAM, {
      chat: null,
      adapterFingerprint: 'fingerprint',
      config: {
        platform: AgentPlatformEnum.TELEGRAM,
        isHumanRelay: false,
        credentials: { apiToken: '123456:test-token', token: 'webhook-secret' },
      },
    });

    return adapters.telegram;
  }

  function stubTelegramFetch() {
    const bodies: string[] = [];
    const fetchStub = sinon.stub(globalThis, 'fetch').callsFake(async (_url: unknown, init?: { body?: unknown }) => {
      bodies.push(typeof init?.body === 'string' ? init.body : '');
      const messageId = bodies.length;

      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          result: {
            message_id: messageId,
            date: 1_700_000_000,
            chat: { id: 42, type: 'private' },
            text: 'sent',
          },
        }),
      } as Response;
    });

    return { bodies, fetchStub };
  }

  afterEach(() => {
    sinon.restore();
  });

  it('creates the Telegram adapter with longMessages split', async () => {
    const telegram = await telegramAdapter();

    expect(telegram.longMessages).to.equal('split');
  });

  it('sends a short Telegram reply as one message', async () => {
    const telegram = await telegramAdapter();
    telegram.sleep = async () => undefined;
    const { bodies, fetchStub } = stubTelegramFetch();

    await telegram.postMessage('telegram:42', { markdown: 'hello' });

    expect(fetchStub.calledOnce).to.equal(true);
    expect(bodies[0]).to.include('hello');
  });

  it('sends a Telegram reply past 4096 characters once rich messages are unavailable', async () => {
    const telegram = await telegramAdapter();
    telegram.sleep = async () => undefined;
    const bodies: string[] = [];
    const methods: string[] = [];
    sinon.stub(globalThis, 'fetch').callsFake(async (url: unknown, init?: { body?: unknown }) => {
      const method = String(url).slice(String(url).lastIndexOf('/') + 1);
      methods.push(method);
      bodies.push(typeof init?.body === 'string' ? init.body : '');

      if (method === 'sendRichMessage') {
        return {
          ok: false,
          status: 404,
          json: async () => ({ ok: false, error_code: 404, description: 'method not found' }),
        } as Response;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          result: {
            message_id: methods.length,
            date: 1_700_000_000,
            chat: { id: 42, type: 'private' },
            text: 'sent',
          },
        }),
      } as Response;
    });
    const markdown = `HEADMARKER ${'abcdef '.repeat(900)} TAILMARKER`;

    await telegram.postMessage('telegram:42', { markdown });

    const regularBodies = bodies.filter((_body, index) => methods[index] === 'sendMessage');
    expect(regularBodies.length).to.be.greaterThan(1);
    const sent = regularBodies.join('\n');
    expect(sent).to.include('HEADMARKER');
    expect(sent).to.include('TAILMARKER');
    expect(regularBodies.some((body) => body.includes('HEADMARKER') && body.includes('TAILMARKER'))).to.equal(false);
  });

  it('sends a Telegram reply past the rich-message limit as consecutive messages', async () => {
    const telegram = await telegramAdapter();
    telegram.sleep = async () => undefined;
    const { bodies, fetchStub } = stubTelegramFetch();
    const markdown = `HEADMARKER\n${'paragraph of words '.repeat(2500)}\nTAILMARKER`;

    await telegram.postMessage('telegram:42', { markdown });

    expect(fetchStub.callCount).to.be.greaterThan(1);
    const sent = bodies.join('\n');
    expect(sent).to.include('HEADMARKER');
    expect(sent).to.include('TAILMARKER');
  });
});
