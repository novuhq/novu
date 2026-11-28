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
              id: 'project-1',
              accountId: 'test-team-id',
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
          _id: 'org-id',
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
      upsertPartnerConfiguration: stub().resolves({ matched: 1, modified: 1 }),
      update: stub().resolves({ matched: 1, modified: 1 }),
      findOne: stub().resolves(null),
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
      organizationId: 'org-id',
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

    // Verify the submitted project is checked against the configuration's team
    assert.calledWith(httpServiceMock.get, `${process.env.VERCEL_BASE_URL}/v9/projects/project-1?teamId=test-team-id`, {
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    // Only the authenticated organization's configuration is written
    assert.notCalled(organizationRepositoryMock.bulkUpdatePartnerConfiguration);
    assert.notCalled(organizationRepositoryMock.update);
    assert.calledOnceWithExactly(organizationRepositoryMock.upsertPartnerConfiguration, {
      organizationId: 'org-id',
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

      if (url.includes('/v9/projects/project-1?')) {
        return of({ data: { id: 'project-1', accountId: 'test-team-id' } });
      }

      return of({ data: {} });
    });

    const command = {
      userId: session.user._id,
      organizationId: 'org-id',
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

      if (url.includes('/v9/projects/project-1?')) {
        return of({ data: { id: 'project-1', accountId: 'test-team-id' } });
      }

      return of({ data: {} });
    });

    const command = {
      userId: session.user._id,
      organizationId: 'org-id',
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

  it('should reject organizations other than the logged-in organization', async () => {
    const command = {
      userId: session.user._id,
      organizationId: 'org-id',
      environmentId: session.environment._id,
      configurationId: 'test-config-id',
      data: {
        'foreign-org-id': ['project-1'],
      },
    };

    try {
      await updateVercelIntegration.execute(command);
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect(error.message).to.equal('One or more organizations are not accessible.');
      assert.notCalled(organizationRepositoryMock.upsertPartnerConfiguration);
      assert.notCalled(organizationRepositoryMock.update);
      assert.notCalled(environmentRepositoryMock.find);
      assert.notCalled(httpServiceMock.get);
    }
  });

  it('should throw BadRequestException when configuration not found', async () => {
    organizationRepositoryMock.findByPartnerConfigurationId.resolves([]);

    try {
      await updateVercelIntegration.execute({
        userId: session.user._id,
        organizationId: 'org-id',
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
    httpServiceMock.get.reset();
    httpServiceMock.get.callsFake((url) => {
      if (url.includes('/v4/projects')) {
        throw new Error('HTTP Error');
      }

      return of({ data: { id: 'project-1', accountId: 'test-team-id' } });
    });

    try {
      await updateVercelIntegration.execute({
        userId: session.user._id,
        organizationId: 'org-id',
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
        organizationId: 'org-id',
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
        const projectId = url.split('/v9/projects/')[1].split('?')[0];

        return of({
          data: {
            id: projectId,
            accountId: 'test-team-id',
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
        _id: 'org-id',
        partnerConfigurations: [{ configurationId: 'test-config-id', projectIds: ['project-1', 'project-2'] }],
      },
    ]);

    const command = {
      userId: session.user._id,
      organizationId: 'org-id',
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
  it('should reject a configuration that belongs to another organization of the user', async () => {
    organizationRepositoryMock.findByPartnerConfigurationId.resolves([
      {
        _id: 'other-org-id',
        partnerConfigurations: [
          {
            configurationId: 'test-config-id',
            accessToken: 'other-org-token',
            teamId: 'test-team-id',
            projectIds: ['project-1'],
          },
        ],
      },
    ]);

    try {
      await updateVercelIntegration.execute({
        userId: session.user._id,
        organizationId: 'org-id',
        environmentId: session.environment._id,
        configurationId: 'test-config-id',
        data: {
          'org-id': ['project-1'],
        },
      });
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect(error.message).to.equal('No partner configuration found.');
      assert.notCalled(httpServiceMock.get);
      assert.notCalled(httpServiceMock.post);
      assert.notCalled(httpServiceMock.delete);
      assert.notCalled(organizationRepositoryMock.upsertPartnerConfiguration);
      assert.notCalled(organizationRepositoryMock.update);
      assert.notCalled(environmentRepositoryMock.find);
    }
  });

  it('should reject projects that do not belong to the configuration team', async () => {
    httpServiceMock.get.reset();
    httpServiceMock.get.callsFake((url) => {
      if (url.includes('/v9/projects/foreign-project')) {
        return of({ data: { id: 'foreign-project', accountId: 'another-team-id' } });
      }

      return of({ data: {} });
    });

    try {
      await updateVercelIntegration.execute({
        userId: session.user._id,
        organizationId: 'org-id',
        environmentId: session.environment._id,
        configurationId: 'test-config-id',
        data: {
          'org-id': ['foreign-project'],
        },
      });
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect(error.message).to.equal('One or more projects are not accessible.');
      assert.notCalled(httpServiceMock.post);
      assert.notCalled(httpServiceMock.delete);
      assert.notCalled(organizationRepositoryMock.upsertPartnerConfiguration);
      assert.notCalled(environmentRepositoryMock.find);
    }
  });

  it('should reject projects the configuration token cannot access', async () => {
    httpServiceMock.get.reset();
    httpServiceMock.get.callsFake((url) => {
      if (url.includes('/v9/projects/missing-project')) {
        throw new Error('Not Found');
      }

      return of({ data: {} });
    });

    try {
      await updateVercelIntegration.execute({
        userId: session.user._id,
        organizationId: 'org-id',
        environmentId: session.environment._id,
        configurationId: 'test-config-id',
        data: {
          'org-id': ['missing-project'],
        },
      });
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect(error.message).to.equal('One or more projects are not accessible.');
      assert.notCalled(httpServiceMock.post);
      assert.notCalled(httpServiceMock.delete);
      assert.notCalled(organizationRepositoryMock.upsertPartnerConfiguration);
    }
  });

  it('should reject projects already linked to another organization', async () => {
    organizationRepositoryMock.findOne.resolves({ _id: 'other-org-id' });

    try {
      await updateVercelIntegration.execute({
        userId: session.user._id,
        organizationId: 'org-id',
        environmentId: session.environment._id,
        configurationId: 'test-config-id',
        data: {
          'org-id': ['project-1'],
        },
      });
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect(error.message).to.equal('One or more projects are already linked to another organization.');
      assert.calledOnceWithExactly(
        organizationRepositoryMock.findOne,
        {
          _id: { $ne: 'org-id' },
          partnerConfigurations: {
            $elemMatch: {
              teamId: 'test-team-id',
              projectIds: { $in: ['project-1'] },
            },
          },
        },
        '_id'
      );
      assert.notCalled(httpServiceMock.get);
      assert.notCalled(httpServiceMock.post);
      assert.notCalled(httpServiceMock.delete);
      assert.notCalled(organizationRepositoryMock.upsertPartnerConfiguration);
    }
  });

  it('should only clean up and unlink the current organization when no projects are submitted', async () => {
    // The user belongs to two orgs that both use this configuration, each with its own linked project
    organizationRepositoryMock.findByPartnerConfigurationId.resolves([
      {
        _id: 'org-id',
        partnerConfigurations: [
          {
            configurationId: 'test-config-id',
            accessToken: 'test-token',
            teamId: 'test-team-id',
            projectIds: ['project-1'],
          },
        ],
      },
      {
        _id: 'other-org-id',
        partnerConfigurations: [
          {
            configurationId: 'test-config-id',
            accessToken: 'test-token',
            teamId: 'test-team-id',
            projectIds: ['project-2'],
          },
        ],
      },
    ]);

    httpServiceMock.get.reset();
    httpServiceMock.get.callsFake((url) => {
      if (url.includes('/v4/projects')) {
        return of({
          data: {
            projects: [
              {
                id: 'project-1',
                env: [{ id: 'env-current', key: 'NOVU_SECRET_KEY', target: ['production'] }],
              },
              {
                id: 'project-2',
                env: [{ id: 'env-other', key: 'NOVU_SECRET_KEY', target: ['production'] }],
              },
            ],
          },
        });
      }

      return of({ data: {} });
    });

    const result = await updateVercelIntegration.execute({
      userId: session.user._id,
      organizationId: 'org-id',
      environmentId: session.environment._id,
      configurationId: 'test-config-id',
      data: {},
    });

    expect(result.success).to.equal(true);

    // Only the current org's project keys are deleted
    assert.calledOnce(httpServiceMock.delete);
    assert.calledWith(
      httpServiceMock.delete,
      `${process.env.VERCEL_BASE_URL}/v9/projects/project-1/env/env-current?teamId=test-team-id`
    );
    for (const call of httpServiceMock.delete.getCalls()) {
      expect(call.args[0]).to.not.include('project-2');
    }

    // Only the current org's configuration is unlinked
    assert.calledOnceWithExactly(
      organizationRepositoryMock.update,
      { _id: 'org-id' },
      { $pull: { partnerConfigurations: { teamId: 'test-team-id' } } }
    );
    assert.notCalled(organizationRepositoryMock.upsertPartnerConfiguration);
    assert.notCalled(organizationRepositoryMock.bulkUpdatePartnerConfiguration);
    assert.notCalled(httpServiceMock.post);
  });
});
