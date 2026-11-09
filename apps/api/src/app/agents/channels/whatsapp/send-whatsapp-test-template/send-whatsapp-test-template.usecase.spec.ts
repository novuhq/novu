import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ChatProviderIdEnum } from '@novu/shared';
import * as safeOutboundHttp from '@novu/shared/utils/safe-outbound-http';
import { expect } from 'chai';
import { restore, stub } from 'sinon';

import { SendWhatsAppTestTemplateCommand } from './send-whatsapp-test-template.command';
import { SendWhatsAppTestTemplate } from './send-whatsapp-test-template.usecase';

const ENV_ID = 'env-id';
const ORG_ID = 'org-id';
const AGENT_ID = 'agent-mongo-id';
const INTEGRATION_ID = 'integration-mongo-id';
const SUBSCRIBER_ID = 'user-123';

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
  let graphApiRequestStub: sinon.SinonStub;

  const sentMessage = () => graphApiRequestStub.firstCall.args[0].body;

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
    graphApiRequestStub = stub(safeOutboundHttp, 'safeOutboundJsonRequest').resolves({
      statusCode: 200,
      body: { messages: [{ id: 'wamid.test' }] },
    } as any);
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

    expect(graphApiRequestStub.called).to.equal(false);
  });

  it('sends using the subscriber phone number', async () => {
    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(true);
    expect(result.messageId).to.equal('wamid.test');
    expect(subscriberRepository.findBySubscriberId.calledOnceWithExactly(ENV_ID, SUBSCRIBER_ID)).to.equal(true);
    expect(graphApiRequestStub.calledOnce).to.equal(true);
    expect(graphApiRequestStub.firstCall.args[0].url.pathname).to.match(/\/phone-number-id\/messages$/);
    expect(sentMessage().to).to.equal('14155551234');
    expect(sentMessage().template.name).to.equal('hello_world');
    expect(sentMessage().template.components).to.equal(undefined);
  });

  it('sends the embedded signup sample template for Novu-managed credentials', async () => {
    integrationRepository.findOne.resolves({
      _id: INTEGRATION_ID,
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      credentials: {
        apiToken: 'token',
        phoneNumberIdentification: 'phone-number-id',
        businessAccountId: 'waba-id',
        isNovuManaged: true,
      },
    });
    subscriberRepository.findBySubscriberId.resolves({
      subscriberId: SUBSCRIBER_ID,
      phone: '+14155551234',
      firstName: 'Alice',
    });

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(true);
    expect(sentMessage().template.name).to.equal('sample_order_confirmation');
    expect(sentMessage().template.components).to.deep.equal([
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'Alice' },
          { type: 'text', text: 'TEST-001' },
        ],
      },
    ]);
  });
});
