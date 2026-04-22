import { ApiServiceLevelEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

const ENTERPRISE_ENABLED = process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';
const describeWhenEE = ENTERPRISE_ENABLED ? describe : describe.skip;
const describeWhenOSS = ENTERPRISE_ENABLED ? describe.skip : describe;

const ENDPOINT = '/v1/llm/messages';
const HEALTH_ENDPOINT = '/v1/llm/health';

const SAMPLE_BODY = {
  model: 'claude-sonnet-4-5',
  max_tokens: 32,
  messages: [{ role: 'user', content: 'Say hi.' }],
};

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_FF = process.env.IS_LLM_GATEWAY_ENABLED;
const ORIGINAL_API_KEY = process.env.NOVU_LLM_GATEWAY_ANTHROPIC_API_KEY;
const ORIGINAL_LD = process.env.LAUNCH_DARKLY_SDK_KEY;
const ORIGINAL_LIMIT = process.env.NOVU_LLM_GATEWAY_DAILY_TOKEN_LIMIT;
const ORIGINAL_ALLOWLIST = process.env.NOVU_LLM_GATEWAY_ALLOWED_MODELS;

function stubAnthropic(payload: Record<string, unknown> = {}, status = 200): void {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'hi' }],
        usage: { input_tokens: 5, output_tokens: 5 },
        ...payload,
      }),
      { status, headers: { 'content-type': 'application/json' } }
    )) as unknown as typeof fetch;
}

describe('LLM Gateway #novu-ee', () => {
  describeWhenOSS('community / OSS build', () => {
    it('returns 404 because the EE module is not loaded', async () => {
      const session = new UserSession();
      await session.initialize();

      const res = await session.testAgent
        .post(ENDPOINT)
        .send(SAMPLE_BODY)
        .set('authorization', `ApiKey ${session.apiKey}`);
      expect(res.status).to.equal(404);
    });
  });

  describeWhenEE('enterprise build', () => {
    let session: UserSession;

    before(() => {
      (process.env as Record<string, string>).LAUNCH_DARKLY_SDK_KEY = '';
      (process.env as Record<string, string>).IS_LLM_GATEWAY_ENABLED = 'true';
      (process.env as Record<string, string>).NOVU_LLM_GATEWAY_ANTHROPIC_API_KEY = 'sk-test-key';
      (process.env as Record<string, string>).NOVU_LLM_GATEWAY_DAILY_TOKEN_LIMIT = '1000';
      delete (process.env as Record<string, string>).NOVU_LLM_GATEWAY_ALLOWED_MODELS;
    });

    beforeEach(async () => {
      session = new UserSession();
      await session.initialize();
      await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.ENTERPRISE);
      stubAnthropic();
    });

    afterEach(() => {
      globalThis.fetch = ORIGINAL_FETCH;
    });

    after(() => {
      globalThis.fetch = ORIGINAL_FETCH;
      process.env.IS_LLM_GATEWAY_ENABLED = ORIGINAL_FF;
      process.env.NOVU_LLM_GATEWAY_ANTHROPIC_API_KEY = ORIGINAL_API_KEY;
      process.env.LAUNCH_DARKLY_SDK_KEY = ORIGINAL_LD;
      process.env.NOVU_LLM_GATEWAY_DAILY_TOKEN_LIMIT = ORIGINAL_LIMIT;
      process.env.NOVU_LLM_GATEWAY_ALLOWED_MODELS = ORIGINAL_ALLOWLIST;
    });

    it('responds to /llm/health when authorized with an ApiKey on an EE tenant', async () => {
      const res = await session.testAgent.get(HEALTH_ENDPOINT).set('authorization', `ApiKey ${session.apiKey}`);
      expect(res.status).to.equal(200);
      expect(res.body.ok).to.equal(true);
    });

    it('returns 401 when no authorization header is present', async () => {
      const res = await session.testAgent.post(ENDPOINT).send(SAMPLE_BODY);
      expect(res.status).to.equal(401);
    });

    it('returns 401 when a JWT bearer token is used', async () => {
      const res = await session.testAgent.post(ENDPOINT).send(SAMPLE_BODY).set('authorization', session.token);
      expect(res.status).to.equal(401);
    });

    it('returns 403 when the LaunchDarkly flag is off', async () => {
      (process.env as Record<string, string>).IS_LLM_GATEWAY_ENABLED = 'false';
      const res = await session.testAgent
        .post(ENDPOINT)
        .send(SAMPLE_BODY)
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(res.status).to.equal(403);
      (process.env as Record<string, string>).IS_LLM_GATEWAY_ENABLED = 'true';
    });

    it('returns 403 when the org is on a non-enterprise tier', async () => {
      await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.PRO);
      const res = await session.testAgent
        .post(ENDPOINT)
        .send(SAMPLE_BODY)
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(res.status).to.equal(403);
    });

    it('returns 200 with passthrough body for non-streaming requests', async () => {
      const res = await session.testAgent
        .post(ENDPOINT)
        .send(SAMPLE_BODY)
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(res.status).to.equal(200);
      expect(res.body.id).to.equal('msg_test');
    });

    it('returns 200 with text/event-stream when streaming', async () => {
      globalThis.fetch = (async () =>
        new Response(
          'event: message_delta\ndata: {"type":"message_delta","usage":{"input_tokens":3,"output_tokens":3}}\n\n',
          { status: 200, headers: { 'content-type': 'text/event-stream' } }
        )) as unknown as typeof fetch;

      const res = await session.testAgent
        .post(ENDPOINT)
        .send({ ...SAMPLE_BODY, stream: true })
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(res.status).to.equal(200);
      expect((res.headers['content-type'] || '').toLowerCase()).to.contain('text/event-stream');
    });

    it('returns 429 when the daily token budget is exhausted', async () => {
      stubAnthropic({ usage: { input_tokens: 600, output_tokens: 500 } });
      await session.testAgent
        .post(ENDPOINT)
        .send({ ...SAMPLE_BODY, max_tokens: 800 })
        .set('authorization', `ApiKey ${session.apiKey}`);

      const res = await session.testAgent
        .post(ENDPOINT)
        .send({ ...SAMPLE_BODY, max_tokens: 800 })
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(res.status).to.equal(429);
    });

    it('returns 400 when the requested model is not on the allowlist', async () => {
      (process.env as Record<string, string>).NOVU_LLM_GATEWAY_ALLOWED_MODELS = 'claude-haiku-4-5';

      const res = await session.testAgent
        .post(ENDPOINT)
        .send(SAMPLE_BODY)
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(res.status).to.equal(400);
      delete (process.env as Record<string, string>).NOVU_LLM_GATEWAY_ALLOWED_MODELS;
    });
  });
});
