import crypto from 'node:crypto';
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
import { assert, restore, stub } from 'sinon';
import { Sync } from '../../../bridge/usecases/sync';
import { ProcessVercelWebhook } from './process-vercel-webhook.usecase';

describe('ProcessVercelWebhook', () => {
  let processVercelWebhook: ProcessVercelWebhook;
  let session: UserSession;
  let organizationRepositoryMock;
  let environmentRepositoryMock;
  let memberRepositoryMock;
  let communityUserRepositoryMock;
  let syncUsecaseMock;
  let loggerMock;
  beforeEach(async () => {
    organizationRepositoryMock = {
      find: stub().resolves([{ _id: 'test-org-id' }]),
    };

    environmentRepositoryMock = {
      findOne: stub().resolves({
        _id: 'test-env-id',
        _organizationId: 'test-org-id',
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
          provide: PinoLogger,
          useValue: loggerMock,
        },
      ],
    }).compile();

    // @ts-ignore
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

  it('should process deployment succeeded event', async () => {
    const body = {
      type: 'deployment.succeeded',
      payload: {
        team: { id: 'team-id' },
        project: { id: 'project-id' },
        deployment: { url: 'test.vercel.app' },
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

    assert.calledWith(organizationRepositoryMock.find, {
      'partnerConfigurations.teamId': 'team-id',
      'partnerConfigurations.projectIds': 'project-id',
    });

    assert.calledWith(environmentRepositoryMock.findOne, {
      _organizationId: 'test-org-id',
      name: 'Production',
    });

    assert.calledWith(memberRepositoryMock.getOrganizationOwnerAccount, 'test-org-id');

    assert.calledWith(communityUserRepositoryMock.findOne, {
      externalId: 'test-user-id',
    });

    assert.calledWith(syncUsecaseMock.execute, {
      organizationId: 'test-org-id',
      userId: 'test-internal-user-id',
      environmentId: 'test-env-id',
      bridgeUrl: 'https://test.vercel.app/api/novu',
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
