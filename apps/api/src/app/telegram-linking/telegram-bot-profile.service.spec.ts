import Axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';

import { TelegramBotProfile } from './telegram-bot-profile.service';

const BOT_SECRET = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const BOT_TOKEN = `12345678:${BOT_SECRET}`;
/** Telegram's ids run past 32 bits. */
const BOT_ID = 8_123_456_789;
const DASHBOARD_URL = 'https://www.agentinbox.md';
const DEFAULT_PICTURE = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const STORED_PICTURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 4, 5, 6]);
const OWN_PICTURE = { storageKey: 'org/env/agents/a/picture-1.png', contentType: 'image/png' };

function methodOf(url: string): string {
  return url.split('/').pop() as string;
}

function telegramAnswer(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('TelegramBotProfile', () => {
  const savedDashboardUrl = process.env.HUMAN_DASHBOARD_URL;

  let answers: Record<string, unknown>;
  let axiosPost: sinon.SinonStub;
  let fetchStub: sinon.SinonStub;
  let getFile: sinon.SinonStub;
  let warn: sinon.SinonStub;
  let profile: TelegramBotProfile;

  beforeEach(() => {
    process.env.HUMAN_DASHBOARD_URL = `${DASHBOARD_URL}/`;
    answers = {
      getMe: { ok: true, result: { id: BOT_ID, is_bot: true, first_name: 'Atlas' } },
      getUserProfilePhotos: { ok: true, result: { total_count: 0, photos: [] } },
    };
    axiosPost = sinon
      .stub(Axios, 'post')
      .callsFake(async (url: string) => ({ data: answers[methodOf(url)] ?? { ok: true, result: true } }));
    fetchStub = sinon
      .stub(globalThis, 'fetch')
      .callsFake(async (input) =>
        methodOf(String(input)) === 'setMyProfilePhoto'
          ? telegramAnswer({ ok: true, result: true })
          : new Response(DEFAULT_PICTURE)
      );
    getFile = sinon.stub().resolves(STORED_PICTURE);
    warn = sinon.stub();
    profile = new TelegramBotProfile({ getFile } as never, { setContext: sinon.stub(), warn } as never);
  });

  afterEach(() => {
    sinon.restore();
    if (savedDashboardUrl === undefined) {
      delete process.env.HUMAN_DASHBOARD_URL;
    } else {
      process.env.HUMAN_DASHBOARD_URL = savedDashboardUrl;
    }
  });

  function telegramMethods(): string[] {
    return axiosPost.getCalls().map((call) => methodOf(call.args[0]));
  }

  function uploadCall(): sinon.SinonSpyCall | undefined {
    return fetchStub.getCalls().find((call) => methodOf(String(call.args[0])) === 'setMyProfilePhoto');
  }

  async function uploadedPicture(): Promise<{ bytes: Buffer; type: string; photo: unknown }> {
    const form = uploadCall()?.args[1].body as FormData;
    const picture = form.get('picture') as File;

    return {
      bytes: Buffer.from(await picture.arrayBuffer()),
      type: picture.type,
      photo: JSON.parse(form.get('photo') as string),
    };
  }

  describe('when the agent has no picture', () => {
    it('gives a bot with no photo the default picture from the Agent Inbox dashboard', async () => {
      await profile.apply(BOT_TOKEN, { picture: 'default-if-none' });

      expect(telegramMethods()).to.deep.equal(['getMe', 'getUserProfilePhotos']);
      expect(axiosPost.secondCall.args[1]).to.deep.equal({ user_id: BOT_ID, limit: 1 });
      expect(String(fetchStub.firstCall.args[0])).to.equal(`${DASHBOARD_URL}/brand/agent-avatar.jpg`);
      expect(await uploadedPicture()).to.deep.equal({
        bytes: DEFAULT_PICTURE,
        type: 'image/jpeg',
        photo: { type: 'static', photo: 'attach://picture' },
      });
      expect(warn.called).to.equal(false);
    });

    it('leaves a bot that already has a photo alone', async () => {
      answers.getUserProfilePhotos = { ok: true, result: { total_count: 1, photos: [[]] } };

      await profile.apply(BOT_TOKEN, { picture: 'default-if-none' });

      expect(fetchStub.called).to.equal(false);
      expect(telegramMethods()).to.not.include('removeMyProfilePhoto');
    });

    const unclearChecks: Array<[string, Record<string, unknown>]> = [
      ['Telegram won’t say who the bot is', { getMe: { ok: false, description: 'Unauthorized' } }],
      ['Telegram names no bot id', { getMe: { ok: true, result: {} } }],
      ['Telegram won’t list the photos', { getUserProfilePhotos: { ok: false, description: 'Bad Request' } }],
      ['the list of photos has no count', { getUserProfilePhotos: { ok: true, result: {} } }],
      ['the count isn’t a number', { getUserProfilePhotos: { ok: true, result: { total_count: '0' } } }],
    ];

    for (const [reason, answer] of unclearChecks) {
      it(`leaves the bot alone when ${reason}`, async () => {
        Object.assign(answers, answer);

        await profile.apply(BOT_TOKEN, { picture: 'default-if-none' });

        expect(fetchStub.called).to.equal(false);
        expect(warn.called).to.equal(true);
      });
    }

    it('leaves the bot alone when Telegram can’t be reached', async () => {
      axiosPost.rejects(new Error('timeout of 10000ms exceeded'));

      await profile.apply(BOT_TOKEN, { picture: 'default-if-none' });

      expect(fetchStub.called).to.equal(false);
      expect(warn.called).to.equal(true);
    });

    it('follows the redirect to www, since the fallback address agentinbox.md answers with one', async () => {
      await profile.apply(BOT_TOKEN, { picture: 'default-if-none' });

      expect(fetchStub.firstCall.args[1]?.redirect ?? 'follow').to.equal('follow');
    });

    it('keeps refusing redirects on the upload, whose address carries the bot token', async () => {
      await profile.apply(BOT_TOKEN, { picture: 'default-if-none' });

      expect(uploadCall()?.args[1].redirect).to.equal('error');
    });

    it('logs and uploads nothing when the dashboard has no default picture', async () => {
      fetchStub.resolves(new Response('<html>Not found</html>', { status: 404 }));

      await profile.apply(BOT_TOKEN, { picture: 'default-if-none' });

      expect(uploadCall()).to.equal(undefined);
      expect(warn.calledOnce).to.equal(true);
    });
  });

  describe('when the agent’s own picture was taken away', () => {
    it('removes it and puts the default picture there, without asking what the bot has', async () => {
      answers.getUserProfilePhotos = { ok: true, result: { total_count: 1, photos: [[]] } };

      await profile.apply(BOT_TOKEN, { picture: null });

      expect(telegramMethods()).to.deep.equal(['removeMyProfilePhoto']);
      expect(axiosPost.calledBefore(fetchStub)).to.equal(true);
      expect((await uploadedPicture()).bytes).to.deep.equal(DEFAULT_PICTURE);
    });

    it('still removes it when the default picture can’t be read', async () => {
      fetchStub.rejects(new Error('fetch failed'));

      await profile.apply(BOT_TOKEN, { picture: null });

      expect(telegramMethods()).to.deep.equal(['removeMyProfilePhoto']);
      expect(uploadCall()).to.equal(undefined);
      expect(warn.calledOnce).to.equal(true);
    });

    it('still tries the default picture when Telegram refuses the removal', async () => {
      answers.removeMyProfilePhoto = { ok: false, description: 'Bad Request: no photo' };

      await profile.apply(BOT_TOKEN, { picture: null });

      expect(uploadCall()).to.not.equal(undefined);
    });
  });

  it('uploads the agent’s own picture without asking what the bot has', async () => {
    await profile.apply(BOT_TOKEN, { picture: OWN_PICTURE });

    expect(telegramMethods()).to.deep.equal([]);
    expect(getFile.firstCall.args[0]).to.equal(OWN_PICTURE.storageKey);
    expect(fetchStub.calledOnce).to.equal(true);
    expect(await uploadedPicture()).to.include({ type: 'image/png' });
    expect((await uploadedPicture()).bytes).to.deep.equal(STORED_PICTURE);
  });

  it('leaves the picture alone when the change is not about it', async () => {
    await profile.apply(BOT_TOKEN, { name: 'Atlas' });

    expect(telegramMethods()).to.deep.equal(['setMyName']);
    expect(fetchStub.called).to.equal(false);
  });

  it('never fails and never logs the bot token, whatever goes wrong', async () => {
    const leak = `https://api.telegram.org/bot${BOT_TOKEN}/setMyProfilePhoto`;
    const axiosFailure = Object.assign(new Error(`connect failed for ${leak}`), { config: { url: leak } });
    axiosPost.rejects(axiosFailure);
    fetchStub.rejects(new TypeError(`Failed to parse URL from ${leak}`));

    await profile.apply(BOT_TOKEN, { name: 'Atlas', picture: OWN_PICTURE });
    await profile.apply(BOT_TOKEN, { picture: null });
    await profile.apply(BOT_TOKEN, { picture: 'default-if-none' });

    expect(warn.called).to.equal(true);
    expect(JSON.stringify(warn.args)).to.not.contain(BOT_SECRET);
  });
});
