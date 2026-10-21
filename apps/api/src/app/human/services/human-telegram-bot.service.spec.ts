import { encryptCredentials } from '@novu/application-generic';
import { expect } from 'chai';
import sinon from 'sinon';

import { HumanTelegramBotService } from './human-telegram-bot.service';

const BOT_TOKEN = '12345678:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const AGENT = { _id: 'agent-1', _environmentId: 'env-1', _organizationId: 'org-1' };

function telegramAnswer(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('HumanTelegramBotService', () => {
  let store: Map<string, string>;
  let links: Array<{ _integrationId: string }>;
  let fetchStub: sinon.SinonStub;
  let warn: sinon.SinonStub;
  let service: HumanTelegramBotService;

  beforeEach(() => {
    store = new Map();
    links = [{ _integrationId: 'bot-1' }];
    fetchStub = sinon.stub(globalThis, 'fetch');
    warn = sinon.stub();
    service = new HumanTelegramBotService(
      { find: sinon.stub().callsFake(async () => links) } as never,
      { findOne: sinon.stub().resolves({ credentials: encryptCredentials({ apiToken: BOT_TOKEN }) }) } as never,
      {
        cacheEnabled: () => true,
        get: async (key: string) => store.get(key) ?? null,
        set: async (key: string, value: string) => {
          store.set(key, value);

          return 'OK';
        },
      } as never,
      { setContext: sinon.stub(), warn } as never
    );
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('asks Telegram once, then answers from the cache, which never holds the token', async () => {
    fetchStub.resolves(telegramAnswer({ ok: true, result: { username: 'atlas_bot' } }));

    expect(await service.usernameFor(AGENT)).to.equal('atlas_bot');
    expect(await service.usernameFor(AGENT)).to.equal('atlas_bot');

    expect(fetchStub.calledOnce).to.equal(true);
    expect(String(fetchStub.firstCall.args[0])).to.match(/\/getMe$/);
    expect([...store.values()]).to.deep.equal(['atlas_bot']);
    expect([...store.keys()].join()).to.not.include(BOT_TOKEN);
  });

  it('leaves the bot out, and caches nothing, when Telegram refuses the token', async () => {
    fetchStub.resolves(telegramAnswer({ ok: false, description: 'Unauthorized' }));

    expect(await service.usernameFor(AGENT)).to.equal(undefined);
    expect(store.size).to.equal(0);
  });

  it('leaves the bot out when Telegram can’t be reached, and never logs the token', async () => {
    fetchStub.rejects(new Error('connect ETIMEDOUT'));

    expect(await service.usernameFor(AGENT)).to.equal(undefined);
    expect(store.size).to.equal(0);
    expect(warn.calledOnce).to.equal(true);
    expect(JSON.stringify(warn.firstCall.args)).to.not.include(BOT_TOKEN);
  });

  it('has no bot to show without a Telegram channel', async () => {
    links = [];

    expect(await service.usernameFor(AGENT)).to.equal(undefined);
    expect(fetchStub.called).to.equal(false);
  });
});
