import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { encryptCredentials } from '@novu/application-generic';
import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { HumanChannelGate } from '../../services/human-channel-gate.service';
import { ConnectHumanWhatsAppKeysCommand } from './connect-human-whatsapp-keys.command';
import { ConnectHumanWhatsAppKeys } from './connect-human-whatsapp-keys.usecase';

const ENV_ID = '64f000000000000000000001';
const ORG_ID = '64f000000000000000000002';
const INTEGRATION_ID = '64f000000000000000000003';
const CALLBACK_URL = 'https://api.example.com/v1/agents/relay1/webhook/whatsapp-main';

describe('ConnectHumanWhatsAppKeys', () => {
  const command = ConnectHumanWhatsAppKeysCommand.create({
    environmentId: ENV_ID,
    organizationId: ORG_ID,
    userId: 'user1',
    agentIdentifier: 'human-relay',
    accessToken: ' EAAG-token ',
    phoneNumberId: 'phone-1',
    businessAccountId: 'waba-1',
    appSecret: 'app-secret',
  });

  function setup(options: { whatsAppEnabled?: boolean; relay?: boolean; linked?: boolean; credentials?: object } = {}) {
    const { whatsAppEnabled = true, relay = true, linked = true, credentials } = options;
    const integrationRepository = {
      find: sinon.stub().resolves(
        linked
          ? [
              {
                _id: INTEGRATION_ID,
                identifier: 'whatsapp-main',
                providerId: ChatProviderIdEnum.WhatsAppBusiness,
                ...(credentials ? { credentials: encryptCredentials(credentials) } : {}),
              },
            ]
          : []
      ),
      findOne: sinon.stub().resolves({ credentials: encryptCredentials({ token: 'verify-123' }) }),
    };
    const validateToken = {
      execute: sinon.stub().resolves({ valid: true, displayPhoneNumber: '+1 555-123-4567' }),
    };
    const updateIntegration = { execute: sinon.stub().resolves({}) };
    const configureWebhook = { execute: sinon.stub().resolves({ success: true, callbackUrl: CALLBACK_URL }) };
    const usecase = new ConnectHumanWhatsAppKeys(
      new HumanChannelGate({ getFlag: sinon.stub().resolves(whatsAppEnabled) } as never),
      validateToken as never,
      updateIntegration as never,
      configureWebhook as never,
      {
        findOne: sinon
          .stub()
          .resolves(relay ? { _id: 'relay1', identifier: 'human-relay', runtime: 'human_relay' } : null),
      } as never,
      { find: sinon.stub().resolves(linked ? [{ _integrationId: INTEGRATION_ID }] : []) } as never,
      integrationRepository as never
    );

    return { usecase, validateToken, updateIntegration, configureWebhook, integrationRepository };
  }

  it('refuses while WhatsApp is turned off, before touching Meta', async () => {
    const { usecase, validateToken } = setup({ whatsAppEnabled: false });

    try {
      await usecase.execute(command);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(UnprocessableEntityException);
    }
    expect(validateToken.execute.called).to.equal(false);
  });

  it('needs a WhatsApp channel linked to the relay first', async () => {
    const { usecase, validateToken } = setup({ linked: false });

    try {
      await usecase.execute(command);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
      expect((err as NotFoundException).getResponse()).to.include({ code: 'channel_not_found' });
    }
    expect(validateToken.execute.called).to.equal(false);
  });

  it('saves nothing when Meta refuses the keys, and says why', async () => {
    const { usecase, validateToken, updateIntegration, configureWebhook } = setup();
    validateToken.execute.resolves({
      valid: false,
      error: { code: 'waba_phone_mismatch', message: 'Not the same account' },
    });

    expect(await usecase.execute(command)).to.deep.equal({
      success: false,
      error: { code: 'waba_phone_mismatch', message: 'Not the same account' },
    });
    expect(updateIntegration.execute.called).to.equal(false);
    expect(configureWebhook.execute.called).to.equal(false);
  });

  it('saves the keys as the operator’s own Meta app and sets the webhook', async () => {
    const { usecase, validateToken, updateIntegration, configureWebhook } = setup();

    const result = await usecase.execute(command);

    expect(validateToken.execute.firstCall.args[0]).to.include({
      accessToken: 'EAAG-token',
      phoneNumberIdentification: 'phone-1',
      businessAccountId: 'waba-1',
    });
    const update = updateIntegration.execute.firstCall.args[0];
    expect(update).to.include({ integrationId: INTEGRATION_ID, environmentId: ENV_ID, organizationId: ORG_ID });
    expect(update.credentials).to.deep.equal({
      apiToken: 'EAAG-token',
      phoneNumberIdentification: 'phone-1',
      businessAccountId: 'waba-1',
      secretKey: 'app-secret',
      isNovuManaged: false,
      from: '+1 555-123-4567',
    });
    expect(configureWebhook.execute.firstCall.args[0]).to.include({
      agentIdentifier: 'human-relay',
      integrationIdentifier: 'whatsapp-main',
    });
    expect(result).to.deep.equal({
      success: true,
      displayPhoneNumber: '+1 555-123-4567',
      webhook: { configured: true, callbackUrl: CALLBACK_URL },
    });
  });

  it('forgets the first message approved on another business account, and keeps one on the same account', async () => {
    const approved = {
      agentInboxWhatsappTemplateStatus: 'APPROVED',
      agentInboxWhatsappTemplateApprovedName: 'agentinbox_first_message',
    };
    const moved = setup({ credentials: { businessAccountId: 'waba-old', ...approved } });
    const same = setup({ credentials: { businessAccountId: 'waba-1', ...approved } });

    await moved.usecase.execute(command);
    await same.usecase.execute(command);

    expect(moved.updateIntegration.execute.firstCall.args[0].credentials).to.include({
      agentInboxWhatsappTemplateStatus: '',
      agentInboxWhatsappTemplateApprovedName: '',
    });
    expect(same.updateIntegration.execute.firstCall.args[0].credentials).to.not.have.property(
      'agentInboxWhatsappTemplateStatus'
    );
  });

  it('hands back the callback URL and verify token when Meta didn’t take the webhook', async () => {
    const { usecase, configureWebhook, integrationRepository } = setup();
    configureWebhook.execute.resolves({
      success: false,
      callbackUrl: CALLBACK_URL,
      fallbackToManual: true,
      reason: { code: 'missing_management_scope', message: 'No management permission' },
    });

    const result = await usecase.execute(command);

    expect(integrationRepository.findOne.firstCall.args[0]).to.deep.equal({
      _id: INTEGRATION_ID,
      _environmentId: ENV_ID,
      _organizationId: ORG_ID,
    });
    expect(result.webhook).to.deep.equal({
      configured: false,
      callbackUrl: CALLBACK_URL,
      verifyToken: 'verify-123',
      reason: 'No management permission',
    });
  });
});
