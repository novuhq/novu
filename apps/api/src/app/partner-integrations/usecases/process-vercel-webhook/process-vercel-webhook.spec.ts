import crypto from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PinoLogger } from '@novu/application-generic';
import { CommunityOrganizationRepository, EnvironmentRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { assert, restore, stub } from 'sinon';
import { VercelBridgeSyncService } from '../../services/vercel-bridge-sync.service';
import { SyncVercelBridge } from '../sync-vercel-bridge/sync-vercel-bridge.usecase';
import { ProcessVercelWebhook } from './process-vercel-webhook.usecase';

describe('ProcessVercelWebhook', () => {
  let processVercelWebhook: ProcessVercelWebhook;
  let session: UserSession;
  let organizationRepositoryMock;
  let environmentRepositoryMock;
  let syncVercelBridgeMock;
  let vercelBridgeSyncServiceMock;
  let loggerMock;

  beforeEach(async () => {
    organizationRepositoryMock = {
      find: stub().resolves([
        {
          _id: 'test-org-id',
          partnerConfigurations: [{ accessToken: 'vercel-token', teamId: 'team-id' }],
        },
      ]),
    };

    environmentRepositoryMock = {
      findOne: stub().resolves({
        _id: 'test-env-id',
        _organizationId: 'test-org-id',
        name: 'Production',
      }),
    };

    syncVercelBridgeMock = {
      execute: stub().resolves(undefined),
    };

    vercelBridgeSyncServiceMock = {
      resolveSyncUserId: stub().resolves('test-internal-user-id'),
      resolveBridgeUrl: stub().resolves('https://stable-app.vercel.app/api/novu'),
    };

    loggerMock = {
      info: stub(),
      error: stub(),
      warn: stub(),
      debug: stub(),
      trace: stub(),
      setContext: stub(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProcessVercelWebhook,
        {
          provide: CommunityOrganizationRepository,
          useValue: organizationRepositoryMock,
        },
        {
          provide: EnvironmentRepository,
          useValue: environmentRepositoryMock,
        },
        {
          provide: SyncVercelBridge,
          useValue: syncVercelBridgeMock,
        },
        {
          provide: VercelBridgeSyncService,
          useValue: vercelBridgeSyncServiceMock,
        },
        {
          provide: PinoLogger,
          useValue: loggerMock,
        },
      ],
    }).compile();

    // @ts-expect-error
    process.env.VERCEL_CLIENT_SECRET = 'test-secret';
    session = new UserSession();
    await session.initialize();
    processVercelWebhook = moduleRef.get<ProcessVercelWebhook>(ProcessVercelWebhook);
  });

  afterEach(() => {
    restore();
  });

  it('should skip non-deployment events', async () => {
    const result = await processVercelWebhook.execute({
      body: {
        type: 'other-event',
      },
      signatureHeader: 'test-signature',
    });

    expect(result).to.equal(true);
    assert.notCalled(organizationRepositoryMock.find);
  });

  it('should process production deployment with stable alias bridge URL', async () => {
    const body = {
      type: 'deployment.succeeded',
      payload: {
        team: { id: 'team-id' },
        project: { id: 'project-id' },
        deployment: { url: 'ephemeral.vercel.app' },
        target: 'production',
      },
    };

    const hmac = crypto
      .createHmac('sha1', process.env.VERCEL_CLIENT_SECRET ?? '')
      .update(JSON.stringify(body))
      .digest('hex');

    const result = await processVercelWebhook.execute({
      body,
      signatureHeader: hmac,
    });

    expect(result).to.equal(true);

    assert.calledOnce(syncVercelBridgeMock.execute);
    assert.calledWith(vercelBridgeSyncServiceMock.resolveBridgeUrl, {
      isProduction: true,
      environmentName: 'Production',
      projectId: 'project-id',
      teamId: 'team-id',
      deploymentUrl: 'ephemeral.vercel.app',
      accessToken: 'vercel-token',
    });
  });

  it('should use deployment URL for preview deployments', async () => {
    environmentRepositoryMock.findOne.resolves({
      _id: 'test-env-id',
      _organizationId: 'test-org-id',
      name: 'Development',
    });

    vercelBridgeSyncServiceMock.resolveBridgeUrl.resolves('https://preview-branch.vercel.app/api/novu');

    const body = {
      type: 'deployment.succeeded',
      payload: {
        team: { id: 'team-id' },
        project: { id: 'project-id' },
        deployment: { url: 'preview-branch.vercel.app' },
        target: 'preview',
      },
    };

    const hmac = crypto
      .createHmac('sha1', process.env.VERCEL_CLIENT_SECRET ?? '')
      .update(JSON.stringify(body))
      .digest('hex');

    await processVercelWebhook.execute({
      body,
      signatureHeader: hmac,
    });

    assert.calledWith(vercelBridgeSyncServiceMock.resolveBridgeUrl, {
      isProduction: false,
      environmentName: 'Development',
      projectId: 'project-id',
      teamId: 'team-id',
      deploymentUrl: 'preview-branch.vercel.app',
      accessToken: 'vercel-token',
    });
  });

  it('should throw error for invalid signature', async () => {
    const body = {
      type: 'deployment.succeeded',
      payload: {
        team: { id: 'team-id' },
        project: { id: 'project-id' },
        deployment: { url: 'test.vercel.app' },
        target: 'production',
      },
    };

    try {
      await processVercelWebhook.execute({
        body,
        signatureHeader: 'invalid-signature',
      });
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect(error.message).to.equal('Invalid signature');
      assert.notCalled(organizationRepositoryMock.find);
    }
  });

  it('should throw error for missing signature', async () => {
    const body = {
      type: 'deployment.succeeded',
      payload: {
        team: { id: 'team-id' },
        project: { id: 'project-id' },
        deployment: { url: 'test.vercel.app' },
        target: 'production',
      },
    };

    try {
      await processVercelWebhook.execute({
        body,
        signatureHeader: '',
      });
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect(error.message).to.equal('Missing signature or secret');
      assert.notCalled(organizationRepositoryMock.find);
    }
  });
});
