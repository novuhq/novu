import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import { restore, stub } from 'sinon';

import * as whatsappGraphApi from '../../../integrations/usecases/whatsapp/whatsapp-graph-api.utils';
import { SendWhatsAppTestTemplate } from './send-whatsapp-test-template.usecase';
import { SendWhatsAppTestTemplateCommand } from './send-whatsapp-test-template.command';

const ENV_ID = 'env-id';
const ORG_ID = 'org-id';
const AGENT_ID = 'agent-mongo-id';
const INTEGRATION_ID = 'integration-mongo-id';
const SUBSCRIBER_ID = 'connect:user-123';

function buildCommand(overrides: Partial<SendWhatsAppTestTemplateCommand> = {}) {
  return SendWhatsAppTestTemplateCommand.create({
    userId: 'user-id',
    environmentId: ENV_ID,
    organizationId: ORG_ID,
    agentIdentifier: 'my-agent',
    integrationIdentifier: 'whatsapp-int',
    subscriberId: SUBSCRIBER_ID,
    ...overrides,
  });
}

describe('SendWhatsAppTestTemplate usecase', () => {
  let agentRepository: { findOne: sinon.SinonStub };
  let integrationRepository: { findOne: sinon.SinonStub };
  let agentIntegrationRepository: { findOne: sinon.SinonStub };
  let subscriberRepository: { findBySubscriberId: sinon.SinonStub };
  let logger: { setContext: sinon.SinonStub; warn: sinon.SinonStub };
  let sendWhatsAppTemplateStub: sinon.SinonStub;

  function buildUsecase() {
    return new SendWhatsAppTestTemplate(
      agentRepository as any,
      integrationRepository as any,
      agentIntegrationRepository as any,
      subscriberRepository as any,
      logger as any
    );
  }

  beforeEach(() => {
    agentRepository = {
      findOne: stub().resolves({ _id: AGENT_ID, identifier: 'my-agent' }),
    };
    integrationRepository = {
      findOne: stub().resolves({
        _id: INTEGRATION_ID,
        providerId: ChatProviderIdEnum.WhatsAppBusiness,
        credentials: {
          apiToken: 'token',
          phoneNumberIdentification: 'phone-number-id',
        },
      }),
    };
    agentIntegrationRepository = {
      findOne: stub().resolves({ _id: 'link-id' }),
    };
    subscriberRepository = {
      findBySubscriberId: stub().resolves({ subscriberId: SUBSCRIBER_ID, phone: '+14155551234' }),
    };
    logger = {
      setContext: stub(),
      warn: stub(),
    };
    sendWhatsAppTemplateStub = stub(whatsappGraphApi, 'sendWhatsAppTemplate').resolves({
      statusCode: 200,
      body: { messages: [{ id: 'wamid.test' }] },
    });
  });

  afterEach(() => {
    restore();
  });

  it('throws when the subscriber is missing', async () => {
    subscriberRepository.findBySubscriberId.resolves(null);

    try {
      await buildUsecase().execute(buildCommand());
      expect.fail('Expected NotFoundException');
    } catch (error) {
      expect(error).to.be.instanceOf(NotFoundException);
    }
  });

  it('throws when the subscriber has no phone number', async () => {
    subscriberRepository.findBySubscriberId.resolves({ subscriberId: SUBSCRIBER_ID, phone: '' });

    try {
      await buildUsecase().execute(buildCommand());
      expect.fail('Expected UnprocessableEntityException');
    } catch (error) {
      expect(error).to.be.instanceOf(UnprocessableEntityException);
    }

    expect(sendWhatsAppTemplateStub.called).to.equal(false);
  });

  it('sends using the subscriber phone number', async () => {
    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(true);
    expect(result.messageId).to.equal('wamid.test');
    expect(subscriberRepository.findBySubscriberId.calledOnceWithExactly(ENV_ID, SUBSCRIBER_ID)).to.equal(true);
    expect(sendWhatsAppTemplateStub.calledOnce).to.equal(true);
    expect(sendWhatsAppTemplateStub.firstCall.args[0].to).to.equal('14155551234');
  });
});
