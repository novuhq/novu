import { HttpService } from '@nestjs/axios';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AnalyticsService } from '@novu/application-generic';
import { OrganizationRepository, PartnerTypeEnum } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { of } from 'rxjs';
import { assert, match, restore, stub } from 'sinon';
import { CreateVercelIntegration } from './create-vercel-integration.usecase';

describe('CreateVercelIntegration', () => {
  let createVercelIntegration: CreateVercelIntegration;
  let session: UserSession;
  let httpServiceMock;
  let organizationRepositoryMock;
  let analyticsServiceMock;
  beforeEach(async () => {
    httpServiceMock = {
      post: stub().returns(
        of({
          data: {
            access_token: 'test-token',
            team_id: 'test-team-id',
          },
        })
      ),
    };

    organizationRepositoryMock = {
      upsertPartnerConfiguration: stub().resolves(true),
    };

    analyticsServiceMock = {
      track: stub().resolves(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateVercelIntegration,
        {
          provide: HttpService,
          useValue: httpServiceMock,
        },
        {
          provide: OrganizationRepository,
          useValue: organizationRepositoryMock,
        },
        { provide: AnalyticsService, useValue: analyticsServiceMock },
      ],
    }).compile();

    session = new UserSession();
    await session.initialize();
    createVercelIntegration = moduleRef.get<CreateVercelIntegration>(CreateVercelIntegration);

    // @ts-ignore
    process.env.VERCEL_CLIENT_ID = 'test-client-id';
    // @ts-ignore
    process.env.VERCEL_CLIENT_SECRET = 'test-client-secret';
    // @ts-ignore
    process.env.VERCEL_REDIRECT_URI = 'test-redirect-uri';
    // @ts-ignore
    process.env.VERCEL_BASE_URL = 'https://api.vercel.com';
  });

  afterEach(() => {
    restore();
  });

  it('should successfully set vercel configuration', async () => {
    const command = {
      organizationId: session.organization._id,
      vercelIntegrationCode: 'test-code',
      configurationId: 'test-config-id',
      userId: session.user._id,
      environmentId: session.environment._id,
    };

    const result = await createVercelIntegration.execute(command);

    expect(result.success).to.equal(true);

    // Verify HTTP call
    assert.calledWith(
      httpServiceMock.post,
      'https://api.vercel.com/v2/oauth/access_token',
      match.instanceOf(URLSearchParams),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    // Verify the URLSearchParams content
    const postCall = httpServiceMock.post.getCall(0);
    const [, postData] = postCall.args;
    expect(postData.get('code')).to.equal('test-code');
    expect(postData.get('client_id')).to.equal('test-client-id');
    expect(postData.get('client_secret')).to.equal('test-client-secret');
    expect(postData.get('redirect_uri')).to.equal('test-redirect-uri');

    // Verify organization repository call
    assert.calledWith(organizationRepositoryMock.upsertPartnerConfiguration, {
      organizationId: command.organizationId,
      configuration: {
        accessToken: 'test-token',
        configurationId: command.configurationId,
        teamId: 'test-team-id',
        partnerType: PartnerTypeEnum.VERCEL,
      },
    });

    assert.calledWith(
      analyticsServiceMock.track,
      'Create Vercel Integration - [Partner Integrations]',
      command.userId,
      { _organization: command.organizationId }
    );
  });

  it('should throw BadRequestException when Vercel returns an error', async () => {
    httpServiceMock.post.throws(new Error('Vercel error'));

    try {
      await createVercelIntegration.execute({
        userId: session.user._id,
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        vercelIntegrationCode: 'test-code',
        configurationId: 'test-config-id',
      });
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect(error.message).to.equal('Vercel error');
      assert.notCalled(organizationRepositoryMock.upsertPartnerConfiguration);
    }
  });
});
