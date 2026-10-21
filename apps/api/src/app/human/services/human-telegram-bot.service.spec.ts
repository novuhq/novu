import { encryptCredentials } from '@novu/application-generic';
import { expect } from 'chai';
import sinon from 'sinon';

import { HumanTelegramBotService } from './human-telegram-bot.service';

const BOT_ID = '12345678';
const BOT_SECRET = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const BOT_TOKEN = `${BOT_ID}:${BOT_SECRET}`;
const AGENT = { _id: 'agent-1', _environmentId: 'env-1', _organizationId: 'org-1' };

function telegramAnswer(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('HumanTelegramBotService', () => {
  let store: Map<string, { value: string; ttl?: number }>;
  let links: Array<{ _integrationId: string }>;
  let integrationId: string;
  let apiToken: string;
  let fetchStub: sinon.SinonStub;
  let warn: sinon.SinonStub;
  let service: HumanTelegramBotService;

  beforeEach(() => {
    store = new Map();
    links = [{ _integrationId: 'bot-1' }];
    integrationId = 'bot-1';
    apiToken = BOT_TOKEN;
    fetchStub = sinon.stub(globalThis, 'fetch');
    warn = sinon.stub();
    service = new HumanTelegramBotService(
      { find: sinon.stub().callsFake(async () => links) } as never,
      {
        findOne: sinon
          .stub()
          .callsFake(async () => ({ _id: integrationId, credentials: encryptCredentials({ apiToken }) })),
      } as never,
      {
        cacheEnabled: () => true,
        get: async (key: string) => store.get(key)?.value ?? null,
        set: async (key: string, value: string, options?: { ttl?: number }) => {
          store.set(key, { value, ttl: options?.ttl });

          return 'OK';
        },
      } as never,
      { setContext: sinon.stub(), warn } as never
    );
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('asks Telegram once, then answers for a day from the cache, which holds none of the secret', async () => {
    fetchStub.resolves(telegramAnswer({ ok: true, result: { username: 'atlas_bot' } }));

    expect(await service.usernameFor(AGENT)).to.equal('atlas_bot');
    expect(await service.usernameFor(AGENT)).to.equal('atlas_bot');

    expect(fetchStub.calledOnce).to.equal(true);
    expect(String(fetchStub.firstCall.args[0])).to.match(/\/getMe$/);
    expect([...store.entries()]).to.deep.equal([
      [`agent-inbox:telegram-bot-username:bot-1:${BOT_ID}`, { value: 'atlas_bot', ttl: 24 * 60 * 60 }],
    ]);
  });

  it('keeps each integration’s answer to itself, even for a token made up with the same bot id', async () => {
    fetchStub.onFirstCall().resolves(telegramAnswer({ ok: true, result: { username: 'atlas_bot' } }));
    fetchStub.onSecondCall().resolves(telegramAnswer({ ok: false, description: 'Unauthorized' }));
    expect(await service.usernameFor(AGENT)).to.equal('atlas_bot');

    integrationId = 'bot-2';
    apiToken = `${BOT_ID}:made-up`;
    expect(await service.usernameFor(AGENT)).to.equal(undefined);

    integrationId = 'bot-1';
    apiToken = BOT_TOKEN;
    expect(await service.usernameFor(AGENT)).to.equal('atlas_bot');
    expect(fetchStub.calledTwice).to.equal(true);
  });

  it('leaves the bot out when Telegram refuses the token, and doesn’t ask again for ten minutes', async () => {
    fetchStub.resolves(telegramAnswer({ ok: false, description: 'Unauthorized' }));

    expect(await service.usernameFor(AGENT)).to.equal(undefined);
    expect(await service.usernameFor(AGENT)).to.equal(undefined);

    expect(fetchStub.calledOnce).to.equal(true);
    expect([...store.values()]).to.deep.equal([{ value: '-', ttl: 10 * 60 }]);
  });

  it('leaves the bot out when Telegram can’t be reached, and never logs the token', async () => {
    fetchStub.rejects(new Error('connect ETIMEDOUT'));

    expect(await service.usernameFor(AGENT)).to.equal(undefined);
    expect(await service.usernameFor(AGENT)).to.equal(undefined);

    expect(fetchStub.calledOnce).to.equal(true);
    expect(warn.calledOnce).to.equal(true);
    expect(JSON.stringify(warn.firstCall.args)).to.not.include(BOT_SECRET);
  });

  it('has no bot to show without a Telegram channel, or with a token that isn’t a bot’s', async () => {
    links = [];
    expect(await service.usernameFor(AGENT)).to.equal(undefined);

    links = [{ _integrationId: 'bot-1' }];
    apiToken = 'not-a-bot-token';
    expect(await service.usernameFor(AGENT)).to.equal(undefined);

    expect(fetchStub.called).to.equal(false);
    expect(store.size).to.equal(0);
  });
});
