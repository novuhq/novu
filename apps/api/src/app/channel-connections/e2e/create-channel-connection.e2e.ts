import { Novu } from '@novu/api';
import { CreateChannelConnectionRequestDto } from '@novu/api/models/components';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { expectSdkExceptionGeneric } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { createSlackIntegration, createSubscribersService, setupChannelTests } from './helpers/channel-helpers';

describe('Create Channel Connection - /channel-connections (POST) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = setupChannelTests(session);
  });

  it('should create channel connection with subscriberId', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const createDto: CreateChannelConnectionRequestDto = {
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      workspace: {
        id: 'T123456',
        name: 'Test Workspace',
      },
      auth: {
        accessToken: 'xoxb-test-token',
      },
    };

    const { result } = await novuClient.channelConnections.create(createDto);

    expect(result.identifier).to.be.a('string');
    expect(result.integrationIdentifier).to.equal(integration.identifier);
    expect(result.subscriberId).to.equal(subscriber.subscriberId);
    expect(result.workspace.id).to.equal('T123456');
    expect(result.workspace.name).to.equal('Test Workspace');
    expect(result.auth.accessToken).to.equal('xoxb-test-token');
    expect(result.contextKeys).to.be.an('array').that.is.empty;
  });

  it('should create channel connection with context', async () => {
    const integration = await createSlackIntegration(session);

    const createDto: CreateChannelConnectionRequestDto = {
      integrationIdentifier: integration.identifier,
      context: {
        tenant: 'acme-corp',
      },
      workspace: {
        id: 'T789012',
        name: 'Acme Workspace',
      },
      auth: {
        accessToken: 'xoxb-context-token',
      },
    };

    const { result } = await novuClient.channelConnections.create(createDto);

    expect(result.identifier).to.be.a('string');
    expect(result.integrationIdentifier).to.equal(integration.identifier);
    expect(result.subscriberId).to.be.null;
    expect(result.contextKeys).to.be.an('array').that.is.not.empty;
    expect(result.contextKeys.some((key) => key.startsWith('tenant:'))).to.be.true;
    expect(result.workspace.id).to.equal('T789012');
  });

  it('should create channel connection with custom identifier', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const customIdentifier = 'custom-conn-123';

    const createDto: CreateChannelConnectionRequestDto = {
      identifier: customIdentifier,
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      workspace: {
        id: 'T345678',
      },
      auth: {
        accessToken: 'xoxb-custom-token',
      },
    };

    const { result } = await novuClient.channelConnections.create(createDto);

    expect(result.identifier).to.equal(customIdentifier);
  });

  it('should fail when integration does not exist', async () => {
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const createDto: CreateChannelConnectionRequestDto = {
      integrationIdentifier: 'non-existent-integration',
      subscriberId: subscriber.subscriberId,
      workspace: {
        id: 'T999999',
      },
      auth: {
        accessToken: 'xoxb-token',
      },
    };

    const { error } = await expectSdkExceptionGeneric(() => novuClient.channelConnections.create(createDto));

    expect(error).to.exist;
    expect(error?.name).to.equal('ErrorDto');
  });

  it('should fail when neither subscriberId nor context provided', async () => {
    const integration = await createSlackIntegration(session);

    const createDto: CreateChannelConnectionRequestDto = {
      integrationIdentifier: integration.identifier,
      workspace: {
        id: 'T111111',
      },
      auth: {
        accessToken: 'xoxb-token',
      },
    } as any;

    const { error } = await expectSdkExceptionGeneric(() => novuClient.channelConnections.create(createDto));

    expect(error).to.exist;
    expect(error?.name).to.equal('ErrorDto');
  });

  it('should fail when duplicate connection exists', async () => {
    const integration = await createSlackIntegration(session);
    const subscribersService = createSubscribersService(session);
    const subscriber = await subscribersService.createSubscriber();

    const createDto: CreateChannelConnectionRequestDto = {
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      workspace: {
        id: 'T222222',
      },
      auth: {
        accessToken: 'xoxb-token',
      },
    };

    await novuClient.channelConnections.create(createDto);

    const { error } = await expectSdkExceptionGeneric(() => novuClient.channelConnections.create(createDto));

    expect(error).to.exist;
    expect(error?.name).to.equal('ErrorDto');
  });
});
