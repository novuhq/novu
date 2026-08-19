import { PhotonImessageChatProvider } from '@novu/providers/dist/cjs/lib/chat/photon-imessage/photon-imessage.provider';
import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import { restore, stub } from 'sinon';

import { SendPhotonTestMessageCommand } from './send-photon-test-message.command';
import { SendAgentPhotonTestMessage } from './send-photon-test-message.usecase';

const ENV_ID = 'env-id';
const ORG_ID = 'org-id';
const AGENT_ID = 'agent-mongo-id';
const INTEGRATION_IDENTIFIER = 'photon-int';
const SUBSCRIBER_ID = 'subscriber-1';

function buildCommand() {
  return SendPhotonTestMessageCommand.create({
    userId: 'user-id',
    environmentId: ENV_ID,
    organizationId: ORG_ID,
    agentIdentifier: 'my-agent',
    integrationIdentifier: INTEGRATION_IDENTIFIER,
    subscriberId: SUBSCRIBER_ID,
  });
}

describe('SendAgentPhotonTestMessage usecase', () => {
  let agentRepository: { findOne: sinon.SinonStub };
  let integrationRepository: { findOne: sinon.SinonStub };
  let agentIntegrationRepository: { findOne: sinon.SinonStub };
  let subscriberRepository: { findBySubscriberId: sinon.SinonStub };
  let logger: { setContext: sinon.SinonStub; warn: sinon.SinonStub };
  let sendMessageStub: sinon.SinonStub;

  function buildUsecase() {
    return new SendAgentPhotonTestMessage(
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
        _id: 'integration-mongo-id',
        identifier: INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.PhotonImessage,
        credentials: { apiKey: 'project-id', secretKey: 'project-secret' },
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
    sendMessageStub = stub(PhotonImessageChatProvider.prototype, 'sendMessage').resolves({
      id: 'message-id',
      date: new Date().toISOString(),
    });
  });

  afterEach(() => {
    restore();
  });

  it('sends the welcome message to the subscriber phone', async () => {
    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(true);
    expect(result.messageId).to.equal('message-id');
    expect(sendMessageStub.calledOnce).to.equal(true);

    const [options] = sendMessageStub.firstCall.args;
    expect(options.channelData.endpoint.phoneNumber).to.equal('+14155551234');
  });

  it('returns missing_credentials when the project credentials are incomplete', async () => {
    integrationRepository.findOne.resolves({
      _id: 'integration-mongo-id',
      identifier: INTEGRATION_IDENTIFIER,
      providerId: ChatProviderIdEnum.PhotonImessage,
      credentials: { apiKey: 'project-id' },
    });

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(false);
    expect(result.error?.code).to.equal('missing_credentials');
    expect(sendMessageStub.called).to.equal(false);
  });

  it('classifies an opt-in failure as recipient_not_opted_in', async () => {
    sendMessageStub.rejects(
      new Error(
        '+14155551234 must text +15550001111 (their assigned Photon number) once, or accept an invite, before this project can message them.'
      )
    );

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(false);
    expect(result.error?.code).to.equal('recipient_not_opted_in');
  });

  it('classifies a recipient registration failure as invalid_recipient', async () => {
    sendMessageStub.rejects(
      new Error('Photon could not register recipient +1415 on the shared iMessage line: bad number')
    );

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(false);
    expect(result.error?.code).to.equal('invalid_recipient');
  });

  it('falls back to photon_rejected for other provider errors', async () => {
    sendMessageStub.rejects(new Error('Photon shared-user limit reached for your plan.'));

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(false);
    expect(result.error?.code).to.equal('photon_rejected');
  });
});
