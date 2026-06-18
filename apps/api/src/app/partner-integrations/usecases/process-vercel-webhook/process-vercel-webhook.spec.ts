import crypto from 'node:crypto';
import { HttpService } from '@nestjs/axios';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PinoLogger } from '@novu/application-generic';
import {
  CommunityOrganizationRepository,
  CommunityUserRepository,
  EnvironmentRepository,
  MemberRepository,
} from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { of } from 'rxjs';
import { assert, restore, stub } from 'sinon';
import { Sync } from '../../../bridge/usecases/sync';
import { SyncAgentsFromBridge } from '../sync-agents-from-bridge/sync-agents-from-bridge.usecase';
import { ProcessVercelWebhook } from './process-vercel-webhook.usecase';

describe('ProcessVercelWebhook', () => {
  let processVercelWebhook: ProcessVercelWebhook;
  let session: UserSession;
  let organizationRepositoryMock;
  let environmentRepositoryMock;
  let memberRepositoryMock;
  let communityUserRepositoryMock;
  let syncUsecaseMock;
  let syncAgentsFromBridgeMock;
  let httpServiceMock;
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

    memberRepositoryMock = {
      getOrganizationOwnerAccount: stub().resolves({
        _userId: 'test-user-id',
      }),
    };

    communityUserRepositoryMock = {
      findOne: stub().resolves({
        _id: 'test-internal-user-id',
      }),
    };

    syncUsecaseMock = {
      execute: stub().resolves(true),
    };

    syncAgentsFromBridgeMock = {
      execute: stub().resolves(undefined),
    };

    httpServiceMock = {
      get: stub().returns(
        of({
          data: {
            targets: {
              production: {
                alias: ['stable-app.vercel.app'],
              },
            },
          },
        })
      ),
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
          provide: MemberRepository,
          useValue: memberRepositoryMock,
        },
        {
          provide: CommunityUserRepository,
          useValue: communityUserRepositoryMock,
        },
        {
          provide: Sync,
          useValue: syncUsecaseMock,
        },
        {
          provide: SyncAgentsFromBridge,
          useValue: syncAgentsFromBridgeMock,
        },
        {
          provide: HttpService,
          useValue: httpServiceMock,
        },
        {
          provide: PinoLogger,
          useValue: loggerMock,
        },
      ],
    }).compile();

    // @ts-expect-error
    process.env.VERCEL_CLIENT_SECRET = 'test-secret';
    // @ts-expect-error
    process.env.VERCEL_BASE_URL = 'https://api.vercel.com';
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

    assert.calledWith(syncUsecaseMock.execute, {
      organizationId: 'test-org-id',
      userId: 'test-internal-user-id',
      environmentId: 'test-env-id',
      bridgeUrl: 'https://stable-app.vercel.app/api/novu',
      source: 'vercel',
    });

    assert.calledOnce(syncAgentsFromBridgeMock.execute);
  });

  it('should use deployment URL for preview deployments', async () => {
    environmentRepositoryMock.findOne.resolves({
      _id: 'test-env-id',
      _organizationId: 'test-org-id',
      name: 'Development',
    });

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

    assert.calledWith(syncUsecaseMock.execute, {
      organizationId: 'test-org-id',
      userId: 'test-internal-user-id',
      environmentId: 'test-env-id',
      bridgeUrl: 'https://preview-branch.vercel.app/api/novu',
      source: 'vercel',
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
