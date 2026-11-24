import { ChatProviderIdEnum } from '@novu/shared';
import * as safeOutboundHttp from '@novu/shared/utils/safe-outbound-http';
import { expect } from 'chai';
import sinon from 'sinon';

import { WhatsAppEmbeddedSignupCommand } from './whatsapp-embedded-signup.command';
import { WhatsAppEmbeddedSignup } from './whatsapp-embedded-signup.usecase';

const ENVIRONMENT_ID = '507f1f77bcf86cd799439011';
const ORGANIZATION_ID = '507f1f77bcf86cd799439012';
const USER_ID = '507f1f77bcf86cd799439013';
const INTEGRATION_ID = '507f1f77bcf86cd799439014';
const AGENT_ID = '507f1f77bcf86cd799439015';
const INTEGRATION_IDENTIFIER = 'whatsapp-business';
const AGENT_IDENTIFIER = 'support-agent';
const ACCESS_TOKEN = 'EAAG-business-token';
const PHONE_NUMBER_ID = '1098765432';
const WABA_ID = '2087654321';
const DISPLAY_PHONE = '+1 555 010 0000';
const CALLBACK_URL = 'https://api.example.com/v1/agents/webhook';

type Call = { method: string; url: URL };

describe('WhatsAppEmbeddedSignup', () => {
  const savedEnv = {
    NOVU_WHATSAPP_APP_ID: process.env.NOVU_WHATSAPP_APP_ID,
    NOVU_WHATSAPP_APP_SECRET: process.env.NOVU_WHATSAPP_APP_SECRET,
    NOVU_WHATSAPP_CONFIG_ID: process.env.NOVU_WHATSAPP_CONFIG_ID,
  };

  let calls: Call[];
  let agentRepository: { findOne: sinon.SinonStub };
  let agentIntegrationRepository: { findOne: sinon.SinonStub };
  let integrationRepository: { findOne: sinon.SinonStub };
  let updateIntegration: { execute: sinon.SinonStub };
  let configureWhatsAppWebhook: { execute: sinon.SinonStub };
  let businessProfile: { apply: sinon.SinonStub };
  let usecase: WhatsAppEmbeddedSignup;

  /** The last segment of a Graph path: `access_token`, the phone number ID, `phone_numbers`, `register`. */
  function pathOf(url: URL): string {
    return url.pathname.split('/').pop() as string;
  }

  function callsTo(path: string, method = 'GET'): Call[] {
    return calls.filter((call) => pathOf(call.url) === path && call.method === method);
  }

  function commandWith(agentIdentifier?: string) {
    return WhatsAppEmbeddedSignupCommand.create({
      userId: USER_ID,
      environmentId: ENVIRONMENT_ID,
      organizationId: ORGANIZATION_ID,
      code: 'signup-code',
      wabaId: WABA_ID,
      phoneNumberId: PHONE_NUMBER_ID,
      integrationIdentifier: INTEGRATION_IDENTIFIER,
      agentIdentifier,
    });
  }

  beforeEach(() => {
    process.env.NOVU_WHATSAPP_APP_ID = 'novu-app';
    process.env.NOVU_WHATSAPP_APP_SECRET = 'app-secret';
    process.env.NOVU_WHATSAPP_CONFIG_ID = 'config';

    calls = [];
    const answers: Record<string, { statusCode: number; body: unknown }> = {
      'GET access_token': { statusCode: 200, body: { access_token: ACCESS_TOKEN } },
      [`GET ${PHONE_NUMBER_ID}`]: {
        statusCode: 200,
        body: { id: PHONE_NUMBER_ID, display_phone_number: DISPLAY_PHONE },
      },
      'GET phone_numbers': { statusCode: 200, body: { data: [{ id: PHONE_NUMBER_ID }] } },
      'POST register': { statusCode: 200, body: { success: true } },
    };

    sinon.stub(safeOutboundHttp, 'safeOutboundJsonRequest').callsFake(async (options) => {
      const url = new URL(String(options.url));
      const method = options.method ?? 'GET';
      calls.push({ method, url });
      const answer = answers[`${method} ${pathOf(url)}`] ?? { statusCode: 404, body: {} };

      return { ...answer, headers: {}, parsedJson: true } as never;
    });

    agentRepository = {
      findOne: sinon.stub().resolves({ _id: AGENT_ID, identifier: AGENT_IDENTIFIER, name: 'Support' }),
    };
    agentIntegrationRepository = { findOne: sinon.stub().resolves({ _id: 'link' }) };
    integrationRepository = {
      findOne: sinon.stub().resolves({
        _id: INTEGRATION_ID,
        identifier: INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.WhatsAppBusiness,
      }),
    };
    updateIntegration = { execute: sinon.stub().resolves({}) };
    configureWhatsAppWebhook = { execute: sinon.stub().resolves({ success: true, callbackUrl: CALLBACK_URL }) };
    businessProfile = { apply: sinon.stub().resolves() };

    usecase = new WhatsAppEmbeddedSignup(
      { getFlag: sinon.stub().resolves(true) } as never,
      agentRepository as never,
      agentIntegrationRepository as never,
      integrationRepository as never,
      updateIntegration as never,
      configureWhatsAppWebhook as never,
      businessProfile as never,
      { mascotLookOf: sinon.stub().resolves(null) } as never,
      { setContext: sinon.stub(), warn: sinon.stub() } as never
    );
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

  describe('without an agent (integration store)', () => {
    it('saves the credentials as Novu-managed and registers the number', async () => {
      const result = await usecase.execute(commandWith());

      expect(result).to.deep.equal({
        success: true,
        integrationId: INTEGRATION_ID,
        integrationIdentifier: INTEGRATION_IDENTIFIER,
        wabaId: WABA_ID,
        displayPhoneNumber: DISPLAY_PHONE,
        phoneRegistrationWarning: undefined,
      });

      expect(updateIntegration.execute.calledOnce).to.equal(true);
      const update = updateIntegration.execute.firstCall.args[0];
      expect(update.integrationId).to.equal(INTEGRATION_ID);
      expect(update.environmentId).to.equal(ENVIRONMENT_ID);
      expect(update.organizationId).to.equal(ORGANIZATION_ID);
      expect(update.allowNovuManagedWhatsAppCredentials).to.equal(true);
      expect(update.credentials).to.deep.equal({
        apiToken: ACCESS_TOKEN,
        phoneNumberIdentification: PHONE_NUMBER_ID,
        businessAccountId: WABA_ID,
        isNovuManaged: true,
        from: DISPLAY_PHONE,
      });

      expect(callsTo('register', 'POST')).to.have.length(1);
    });

    it('looks the integration up inside the caller environment and organization', async () => {
      await usecase.execute(commandWith());

      expect(integrationRepository.findOne.firstCall.args[0]).to.deep.equal({
        _environmentId: ENVIRONMENT_ID,
        _organizationId: ORGANIZATION_ID,
        identifier: INTEGRATION_IDENTIFIER,
      });
    });

    it('skips the agent lookup, the relay profile and the webhook', async () => {
      await usecase.execute(commandWith());

      expect(agentRepository.findOne.called).to.equal(false);
      expect(agentIntegrationRepository.findOne.called).to.equal(false);
      expect(businessProfile.apply.called).to.equal(false);
      expect(configureWhatsAppWebhook.execute.called).to.equal(false);
    });

    it('rejects an integration of another provider', async () => {
      integrationRepository.findOne.resolves({
        _id: INTEGRATION_ID,
        identifier: INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.Slack,
      });

      let error: Error | undefined;
      try {
        await usecase.execute(commandWith());
      } catch (err) {
        error = err as Error;
      }

      expect(error?.message).to.contain('is not a WhatsApp Business integration');
      expect(updateIntegration.execute.called).to.equal(false);
    });
  });

  describe('with an agent', () => {
    it('checks the agent link and configures the agent webhook', async () => {
      const result = await usecase.execute(commandWith(AGENT_IDENTIFIER));

      expect(agentRepository.findOne.calledOnce).to.equal(true);
      expect(agentIntegrationRepository.findOne.calledOnce).to.equal(true);
      expect(updateIntegration.execute.calledOnce).to.equal(true);
      expect(callsTo('register', 'POST')).to.have.length(1);

      expect(configureWhatsAppWebhook.execute.calledOnce).to.equal(true);
      const webhook = configureWhatsAppWebhook.execute.firstCall.args[0];
      expect(webhook.agentIdentifier).to.equal(AGENT_IDENTIFIER);
      expect(webhook.integrationIdentifier).to.equal(INTEGRATION_IDENTIFIER);

      expect(result.success).to.equal(true);
      expect(result.callbackUrl).to.equal(CALLBACK_URL);
    });

    it('reports a webhook failure after the credentials are saved', async () => {
      configureWhatsAppWebhook.execute.resolves({
        success: false,
        callbackUrl: CALLBACK_URL,
        reason: { code: 'meta_rejected', message: 'Meta said no.' },
      });

      const result = await usecase.execute(commandWith(AGENT_IDENTIFIER));

      expect(updateIntegration.execute.calledOnce).to.equal(true);
      expect(result.success).to.equal(false);
      expect(result.error).to.deep.equal({ code: 'webhook_configuration_failed', message: 'Meta said no.' });
    });
  });
});
