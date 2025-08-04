import { HttpService } from '@nestjs/axios';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AnalyticsService, PinoLogger } from '@novu/application-generic';
import { CommunityUserRepository, EnvironmentRepository, MemberRepository, OrganizationRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { of } from 'rxjs';
import { assert, restore, stub } from 'sinon';
import { Sync } from '../../../bridge/usecases/sync';
import { UpdateVercelIntegration } from './update-vercel-integration.usecase';

describe('UpdateVercelIntegration', () => {
  let updateVercelIntegration: UpdateVercelIntegration;
  let session: UserSession;
  let httpServiceMock;
  let environmentRepositoryMock;
  let organizationRepositoryMock;
  let analyticsServiceMock;
  let syncMock;
  let memberRepositoryMock;
  let communityUserRepositoryMock;
  let loggerMock;

  beforeEach(async () => {
    // @ts-ignore
    process.env.VERCEL_BASE_URL = 'https://api.vercel.com';

    httpServiceMock = {
      get: stub().callsFake((url, config) => {
        if (url.includes('/v4/projects') && url.includes('teamId=test-team-id')) {
          return of({
            data: {
              projects: [
                {
                  id: 'project-1',
                  env: [
                    { id: 'env-1', key: 'NEXT_PUBLIC_NOVU_CLIENT_APP_ID', target: ['production'] },
                    { id: 'env-2', key: 'NOVU_CLIENT_APP_ID', target: ['production'] },
                    { id: 'env-3', key: 'NOVU_SECRET_KEY', target: ['production'] },
                    { id: 'env-4', key: 'NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER', target: ['production'] },
                  ],
                },
              ],
            },
          });
        } else if (url.includes('/v9/projects/project-1') && url.includes('teamId=test-team-id')) {
          return of({
            data: {
              targets: {
                production: {
                  alias: ['prod-alias.vercel.app'],
                },
                development: {
                  alias: ['dev-alias.vercel.app'],
                },
              },
            },
          });
        }

        // Default response for any other URLs
        return of({ data: {} });
      }),
      post: stub().returns(of({ data: { success: true } })),
      delete: stub().returns(of({ data: { success: true } })),
    };

    organizationRepositoryMock = {
      findByPartnerConfigurationId: stub().resolves([
        {
          partnerConfigurations: [
            {
              configurationId: 'test-config-id',
              accessToken: 'test-token',
              teamId: 'test-team-id',
              projectIds: ['project-1'],
            },
          ],
        },
      ]),
      bulkUpdatePartnerConfiguration: stub().resolves(true),
    };

    analyticsServiceMock = {
      track: stub().resolves(),
    };

    syncMock = {
      execute: stub().resolves(),
    };

    environmentRepositoryMock = {
      find: stub().resolves([
        {
          _id: 'env-id',
          name: 'Production',
          identifier: 'prod',
          _organizationId: 'org-id',
          apiKeys: [{ key: 'encrypted-key' }],
        },
        {
          _id: 'env-id-2',
          name: 'Development',
          identifier: 'dev',
          _organizationId: 'org-id',
          apiKeys: [{ key: 'encrypted-key-2' }],
        },
      ]),
    };

    memberRepositoryMock = {
      getOrganizationOwnerAccount: stub().resolves({ _userId: 'admin-id' }),
    };

    communityUserRepositoryMock = {
      findOne: stub().resolves({ _id: 'internal-user-id' }),
    };

    loggerMock = {
      log: stub(),
      error: stub(),
      warn: stub(),
      debug: stub(),
      info: stub(),
      trace: stub(),
      setContext: stub(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateVercelIntegration,
        { provide: HttpService, useValue: httpServiceMock },
        { provide: EnvironmentRepository, useValue: environmentRepositoryMock },
        { provide: OrganizationRepository, useValue: organizationRepositoryMock },
        { provide: AnalyticsService, useValue: analyticsServiceMock },
        { provide: Sync, useValue: syncMock },
        { provide: MemberRepository, useValue: memberRepositoryMock },
        { provide: CommunityUserRepository, useValue: communityUserRepositoryMock },
        { provide: PinoLogger, useValue: loggerMock },
      ],
    }).compile();

    session = new UserSession();
    await session.initialize();
    updateVercelIntegration = moduleRef.get<UpdateVercelIntegration>(UpdateVercelIntegration);
  });

  afterEach(() => {
    restore();
  });

  it('should update vercel configuration successfully', async () => {
    const command = {
      userId: session.user._id,
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      configurationId: 'test-config-id',
      data: {
        'org-id': ['project-1'],
      },
    };

    const result = await updateVercelIntegration.execute(command);

    expect(result.success).to.equal(true);

    // Verify existing projects lookup
    assert.calledWith(organizationRepositoryMock.findByPartnerConfigurationId, {
      userId: command.userId,
      configurationId: command.configurationId,
    });

    // Verify project environment variables lookup
    assert.calledWith(httpServiceMock.get, `${process.env.VERCEL_BASE_URL}/v4/projects?teamId=test-team-id`, {
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    // Verify environment variable deletion calls
    assert.calledWith(
      httpServiceMock.delete,
      `${process.env.VERCEL_BASE_URL}/v9/projects/project-1/env/env-1?teamId=test-team-id`,
      {
        headers: {
          Authorization: 'Bearer test-token',
        },
      }
    );
    assert.calledWith(
      httpServiceMock.delete,
      `${process.env.VERCEL_BASE_URL}/v9/projects/project-1/env/env-2?teamId=test-team-id`,
      {
        headers: {
          Authorization: 'Bearer test-token',
        },
      }
    );
    assert.calledWith(
      httpServiceMock.delete,
      `${process.env.VERCEL_BASE_URL}/v9/projects/project-1/env/env-3?teamId=test-team-id`,
      {
        headers: {
          Authorization: 'Bearer test-token',
        },
      }
    );
    assert.calledWith(
      httpServiceMock.delete,
      `${process.env.VERCEL_BASE_URL}/v9/projects/project-1/env/env-4?teamId=test-team-id`,
      {
        headers: {
          Authorization: 'Bearer test-token',
        },
      }
    );

    assert.calledWith(organizationRepositoryMock.bulkUpdatePartnerConfiguration, {
      userId: command.userId,
      data: command.data,
      configuration: {
        configurationId: 'test-config-id',
        accessToken: 'test-token',
        teamId: 'test-team-id',
        projectIds: ['project-1'],
      },
    });

    // Verify environment repository calls
    assert.calledWith(environmentRepositoryMock.find, {
      _organizationId: { $in: ['org-id'] },
    });

    // Verify environment variables setup
    assert.calledWith(
      httpServiceMock.post,
      'https://api.vercel.com/v10/projects/project-1/env?upsert=true&teamId=test-team-id',
      [
        {
          target: ['production'],
          type: 'encrypted',
          value: 'prod',
          key: 'NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER',
        },
      ],
      {
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      }
    );

    // Verify bridge URL update
    assert.calledWith(httpServiceMock.get, 'https://api.vercel.com/v9/projects/project-1?teamId=test-team-id', {
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    });

    // Verify sync execution
    assert.calledWith(syncMock.execute, {
      organizationId: 'org-id',
      userId: 'internal-user-id',
      environmentId: 'env-id',
      bridgeUrl: 'https://prod-alias.vercel.app/api/novu',
      source: 'vercel',
    });

    // Verify analytics
    assert.calledWith(
      analyticsServiceMock.track,
      'Update Vercel Integration - [Partner Integrations]',
      command.userId,
      { _organization: command.organizationId }
    );
  });

  it('should handle projects with no environment variables', async () => {
    // Reset the stub before creating a new behavior
    httpServiceMock.get.reset();
    httpServiceMock.get.callsFake((url) => {
      if (url.includes('/v4/projects')) {
        return of({
          data: {
            projects: [
              {
                id: 'project-1',
                env: [], // Empty env array
              },
            ],
          },
        });
      }

      return of({ data: {} });
    });

    const command = {
      userId: session.user._id,
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      configurationId: 'test-config-id',
      data: {
        'org-id': ['project-1'],
      },
    };

    const result = await updateVercelIntegration.execute(command);

    expect(result.success).to.equal(true);
    assert.notCalled(httpServiceMock.delete);
  });

  it('should handle projects with missing Novu environment variables', async () => {
    // Reset the stub before creating a new behavior
    httpServiceMock.get.reset();
    httpServiceMock.get.callsFake((url) => {
      if (url.includes('/v4/projects')) {
        return of({
          data: {
            projects: [
              {
                id: 'project-1',
                env: [{ id: 'env-1', key: 'OTHER_ENV_VAR' }], // Only non-Novu env var
              },
            ],
          },
        });
      }

      return of({ data: {} });
    });

    const command = {
      userId: session.user._id,
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      configurationId: 'test-config-id',
      data: {
        'org-id': ['project-1'],
      },
    };

    const result = await updateVercelIntegration.execute(command);

    expect(result.success).to.equal(true);
    assert.notCalled(httpServiceMock.delete);
  });

  it('should throw BadRequestException when configuration not found', async () => {
    organizationRepositoryMock.findByPartnerConfigurationId.resolves([]);

    try {
      await updateVercelIntegration.execute({
        userId: session.user._id,
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        configurationId: 'test-config-id',
        data: {},
      });
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect(error.message).to.equal('No partner configuration found.');
      assert.notCalled(httpServiceMock.get);
      assert.notCalled(httpServiceMock.delete);
    }
  });

  it('should handle errors during project fetch', async () => {
    httpServiceMock.get.throws(new Error('HTTP Error'));

    try {
      await updateVercelIntegration.execute({
        userId: session.user._id,
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        configurationId: 'test-config-id',
        data: {
          'org-id': ['project-1'],
        },
      });
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect(error.message).to.equal('HTTP Error');
      assert.notCalled(httpServiceMock.delete);
    }
  });

  it('should handle errors during environment variable deletion', async () => {
    httpServiceMock.delete.onCall(0).throws(new Error('Delete Error'));

    try {
      await updateVercelIntegration.execute({
        userId: session.user._id,
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        configurationId: 'test-config-id',
        data: {
          'org-id': ['project-1'],
        },
      });
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect(error.message).to.equal('Delete Error');
      assert.called(httpServiceMock.get);
      assert.called(httpServiceMock.delete);
    }
  });

  it('should handle multiple projects with environment variables', async () => {
    // Reset the stub before creating a new behavior
    httpServiceMock.get.reset();
    httpServiceMock.get.callsFake((url) => {
      if (url.includes('/v4/projects')) {
        return of({
          data: {
            projects: [
              {
                id: 'project-1',
                env: [{ id: 'env-1', key: 'NEXT_PUBLIC_NOVU_CLIENT_APP_ID', target: ['production'] }],
              },
              {
                id: 'project-2',
                env: [{ id: 'env-2', key: 'NOVU_SECRET_KEY', target: ['production'] }],
              },
            ],
          },
        });
      } else if (url.includes('/v9/projects/')) {
        return of({
          data: {
            targets: {
              production: {
                alias: ['prod-alias.vercel.app'],
              },
              development: {
                alias: ['dev-alias.vercel.app'],
              },
            },
          },
        });
      }

      return of({ data: {} });
    });

    organizationRepositoryMock.findByPartnerConfigurationId.resolves([
      {
        partnerConfigurations: [{ configurationId: 'test-config-id', projectIds: ['project-1', 'project-2'] }],
      },
    ]);

    const command = {
      userId: session.user._id,
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      configurationId: 'test-config-id',
      data: {
        'org-id': ['project-1', 'project-2'],
      },
    };

    const result = await updateVercelIntegration.execute(command);

    expect(result.success).to.equal(true);
    assert.calledTwice(httpServiceMock.delete);
  });
});
