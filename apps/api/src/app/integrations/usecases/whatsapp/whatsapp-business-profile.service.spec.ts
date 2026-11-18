import * as safeOutboundHttp from '@novu/shared/utils/safe-outbound-http';
import { expect } from 'chai';
import sinon from 'sinon';

import { WhatsAppBusinessProfile } from './whatsapp-business-profile.service';

const ACCESS_TOKEN = 'EAAG-secret-token';
const PHONE_NUMBER_ID = '1098765432';
const NOVU_APP_ID = 'novu-app';
const DASHBOARD_URL = 'https://www.agentinbox.md';
const DEFAULT_PICTURE = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const STORED_PICTURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 4, 5, 6]);
const OWN_PICTURE = { storageKey: 'org/env/agents/a/picture-1.png', contentType: 'image/png' };
const NUMBER = { accessToken: ACCESS_TOKEN, phoneNumberId: PHONE_NUMBER_ID, isNovuManaged: true };

type Call = { method: string; url: URL; headers: Record<string, string | undefined>; body: unknown };

describe('WhatsAppBusinessProfile', () => {
  const savedEnv = {
    HUMAN_DASHBOARD_URL: process.env.HUMAN_DASHBOARD_URL,
    NOVU_WHATSAPP_APP_ID: process.env.NOVU_WHATSAPP_APP_ID,
    NOVU_WHATSAPP_APP_SECRET: process.env.NOVU_WHATSAPP_APP_SECRET,
    NOVU_WHATSAPP_CONFIG_ID: process.env.NOVU_WHATSAPP_CONFIG_ID,
  };

  let calls: Call[];
  let answers: Record<string, { statusCode: number; body: unknown }>;
  let fetchStub: sinon.SinonStub;
  let getFile: sinon.SinonStub;
  let warn: sinon.SinonStub;
  let profile: WhatsAppBusinessProfile;

  /** The Graph path of a call, with the version left out: `uploads`, `whatsapp_business_profile`, `upload:…`. */
  function pathOf(url: URL): string {
    return url.pathname.split('/').pop() as string;
  }

  function callsTo(path: string, method = 'POST'): Call[] {
    return calls.filter((call) => pathOf(call.url) === path && call.method === method);
  }

  beforeEach(() => {
    process.env.HUMAN_DASHBOARD_URL = `${DASHBOARD_URL}/`;
    process.env.NOVU_WHATSAPP_APP_ID = NOVU_APP_ID;
    process.env.NOVU_WHATSAPP_APP_SECRET = 'app-secret';
    process.env.NOVU_WHATSAPP_CONFIG_ID = 'config';

    calls = [];
    answers = {
      'GET whatsapp_business_profile': { statusCode: 200, body: { data: [{ about: 'Hi' }] } },
      'POST uploads': { statusCode: 200, body: { id: 'upload:session-1' } },
      'POST upload:session-1': { statusCode: 200, body: { h: 'picture-handle' } },
      'POST whatsapp_business_profile': { statusCode: 200, body: { success: true } },
      'GET app': { statusCode: 200, body: { id: 'own-app' } },
    };

    sinon.stub(safeOutboundHttp, 'safeOutboundJsonRequest').callsFake(async (options) => {
      const url = new URL(String(options.url));
      const method = options.method ?? 'GET';
      calls.push({ method, url, headers: (options.headers ?? {}) as Record<string, string>, body: options.body });
      const answer = answers[`${method} ${pathOf(url)}`] ?? { statusCode: 404, body: {} };

      return { ...answer, headers: {}, parsedJson: true } as never;
    });
    fetchStub = sinon.stub(globalThis, 'fetch').resolves(new Response(DEFAULT_PICTURE));
    getFile = sinon.stub().resolves(STORED_PICTURE);
    warn = sinon.stub();
    profile = new WhatsAppBusinessProfile({ getFile } as never, { setContext: sinon.stub(), warn } as never);
  });

  afterEach(() => {
    sinon.restore();
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("uploads the agent's own picture through Novu's app and sets it with the description", async () => {
    await profile.apply(NUMBER, { description: ' Ships the app. ', picture: OWN_PICTURE });

    const [start] = callsTo('uploads');
    expect(start.url.pathname).to.contain(`/${NOVU_APP_ID}/uploads`);
    expect(start.url.searchParams.get('file_type')).to.equal('image/png');
    expect(start.url.searchParams.get('file_length')).to.equal(String(STORED_PICTURE.length));

    const [upload] = callsTo('upload:session-1');
    expect(upload.body).to.equal(STORED_PICTURE);
    expect(upload.headers.file_offset).to.equal('0');

    const [update] = callsTo('whatsapp_business_profile');
    expect(update.url.pathname).to.contain(`/${PHONE_NUMBER_ID}/whatsapp_business_profile`);
    expect(update.body).to.deep.equal({
      messaging_product: 'whatsapp',
      description: 'Ships the app.',
      about: 'Ships the app.',
      profile_picture_handle: 'picture-handle',
    });
    expect(getFile.calledOnceWith(OWN_PICTURE.storageKey)).to.equal(true);
  });

  it('keeps the access token out of every URL', async () => {
    await profile.apply(NUMBER, { picture: OWN_PICTURE });

    expect(calls.length).to.be.greaterThan(0);
    for (const call of calls) {
      expect(call.url.toString()).not.to.contain(ACCESS_TOKEN);
    }
    expect(callsTo('uploads')[0].headers.Authorization).to.equal(`OAuth ${ACCESS_TOKEN}`);
  });

  it('puts the default picture on a number with no photo yet', async () => {
    answers['GET whatsapp_business_profile'] = { statusCode: 200, body: { data: [{ about: 'Hi' }] } };

    await profile.apply(NUMBER, { picture: 'default-if-none' });

    expect(String(fetchStub.firstCall.args[0])).to.equal(`${DASHBOARD_URL}/brand/agent-avatar.jpg`);
    expect(callsTo('upload:session-1')[0].body).to.deep.equal(DEFAULT_PICTURE);
    expect(callsTo('whatsapp_business_profile')[0].body).to.deep.equal({
      messaging_product: 'whatsapp',
      profile_picture_handle: 'picture-handle',
    });
  });

  it('leaves a photo set in WhatsApp Manager alone', async () => {
    answers['GET whatsapp_business_profile'] = {
      statusCode: 200,
      body: { data: [{ profile_picture_url: 'https://pps.whatsapp.net/photo.jpg' }] },
    };

    await profile.apply(NUMBER, { picture: 'default-if-none' });

    expect(callsTo('uploads')).to.have.length(0);
    expect(callsTo('whatsapp_business_profile')).to.have.length(0);
  });

  it('leaves the photo alone when Meta does not say whether there is one', async () => {
    answers['GET whatsapp_business_profile'] = { statusCode: 500, body: { error: { message: 'down' } } };

    await profile.apply(NUMBER, { picture: 'default-if-none' });

    expect(callsTo('uploads')).to.have.length(0);
    expect(warn.called).to.equal(true);
  });

  it('puts the default picture back when the agent picture is taken away', async () => {
    await profile.apply(NUMBER, { picture: null });

    expect(callsTo('whatsapp_business_profile', 'GET')).to.have.length(0);
    expect(callsTo('whatsapp_business_profile')[0].body).to.deep.equal({
      messaging_product: 'whatsapp',
      profile_picture_handle: 'picture-handle',
    });
  });

  it("uploads through the token's own app for a number connected with its own Meta app", async () => {
    await profile.apply({ accessToken: ACCESS_TOKEN, phoneNumberId: PHONE_NUMBER_ID }, { picture: OWN_PICTURE });

    expect(callsTo('app', 'GET')).to.have.length(1);
    expect(callsTo('uploads')[0].url.pathname).to.contain('/own-app/uploads');
  });

  it('still sets the description when the upload is refused', async () => {
    answers['POST uploads'] = { statusCode: 400, body: { error: { message: 'Invalid app' } } };

    await profile.apply(NUMBER, { description: 'Ships the app.', picture: OWN_PICTURE });

    expect(callsTo('whatsapp_business_profile')[0].body).to.deep.equal({
      messaging_product: 'whatsapp',
      description: 'Ships the app.',
      about: 'Ships the app.',
    });
    expect(warn.called).to.equal(true);
  });

  it('clears the description but keeps the about text, which cannot be empty', async () => {
    await profile.apply(NUMBER, { description: '' });

    expect(callsTo('whatsapp_business_profile')[0].body).to.deep.equal({
      messaging_product: 'whatsapp',
      description: '',
    });
  });

  it('cuts the about text and description to the lengths Meta takes', async () => {
    await profile.apply(NUMBER, { description: 'x'.repeat(600) });

    const body = callsTo('whatsapp_business_profile')[0].body as { about: string; description: string };
    expect(body.about).to.have.length(139);
    expect(body.description).to.have.length(512);
  });

  it('cuts at whole characters, never through an emoji', async () => {
    await profile.apply(NUMBER, { description: `${'x'.repeat(138)}😀😀` });

    const body = callsTo('whatsapp_business_profile')[0].body as { about: string };
    expect(body.about).to.equal(`${'x'.repeat(138)}😀`);
  });

  it("uploads through Novu's app with only its app ID set, as on a server that does no signups", async () => {
    delete process.env.NOVU_WHATSAPP_CONFIG_ID;
    delete process.env.NOVU_WHATSAPP_APP_SECRET;

    await profile.apply(NUMBER, { picture: OWN_PICTURE });

    expect(callsTo('uploads')[0].url.pathname).to.contain(`/${NOVU_APP_ID}/uploads`);
  });

  it('calls Meta for nothing when there is nothing to change', async () => {
    await profile.apply(NUMBER, {});

    expect(calls).to.have.length(0);
  });

  it('never throws when Meta cannot be reached', async () => {
    (safeOutboundHttp.safeOutboundJsonRequest as sinon.SinonStub).rejects(new Error(`socket hang up ${ACCESS_TOKEN}`));

    await profile.apply(NUMBER, { description: 'Ships the app.', picture: OWN_PICTURE });

    expect(warn.called).to.equal(true);
    for (const call of warn.getCalls()) {
      expect(JSON.stringify(call.args)).not.to.contain(ACCESS_TOKEN);
    }
  });
});
