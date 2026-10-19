import { HttpService } from '@nestjs/axios';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrganizationRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { of } from 'rxjs';
import { assert, restore, stub } from 'sinon';
import { GetVercelIntegrationProjects } from './get-vercel-integration-projects.usecase';

describe('GetVercelIntegrationProjects', () => {
  let getVercelIntegrationProjects: GetVercelIntegrationProjects;
  let session: UserSession;
  let httpServiceMock;
  let organizationRepositoryMock;

  beforeEach(async () => {
    httpServiceMock = {
      get: stub().returns(
        of({
          data: {
            projects: [
              { id: 'project-1', name: 'Project One' },
              { id: 'project-2', name: 'Project Two' },
            ],
            pagination: {
              next: 'next-page-token',
            },
          },
        })
      ),
    };

    organizationRepositoryMock = {
      findByPartnerConfigurationId: stub().resolves([
        {
          partnerConfigurations: [
            {
              configurationId: 'test-config-id',
              accessToken: 'test-token',
              teamId: 'test-team-id',
            },
          ],
        },
      ]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        GetVercelIntegrationProjects,
        {
          provide: HttpService,
          useValue: httpServiceMock,
        },
        {
          provide: OrganizationRepository,
          useValue: organizationRepositoryMock,
        },
      ],
    }).compile();

    session = new UserSession();
    await session.initialize();
    getVercelIntegrationProjects = moduleRef.get<GetVercelIntegrationProjects>(GetVercelIntegrationProjects);
  });

  afterEach(() => {
    restore();
  });

  it('should get vercel projects successfully', async () => {
    const command = {
      userId: session.user._id,
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      configurationId: 'test-config-id',
    };

    const result = await getVercelIntegrationProjects.execute(command);

    expect(result.projects).to.have.length(2);
    expect(result.projects[0]).to.deep.equal({
      name: 'Project One',
      id: 'project-1',
    });
    expect(result.pagination).to.deep.equal({
      next: 'next-page-token',
    });

    assert.calledWith(organizationRepositoryMock.findByPartnerConfigurationId, {
      userId: command.userId,
      configurationId: command.configurationId,
    });

    const expectedUrl = `${process.env.VERCEL_BASE_URL}/v10/projects?limit=100&teamId=test-team-id`;
    assert.calledWith(httpServiceMock.get, expectedUrl, {
      headers: {
        Authorization: 'Bearer test-token',
      },
    });
  });

  it('should throw BadRequestException when no configuration found', async () => {
    organizationRepositoryMock.findByPartnerConfigurationId.resolves([]);

    try {
      await getVercelIntegrationProjects.execute({
        userId: session.user._id,
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        configurationId: 'test-config-id',
      });
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect(error.message).to.equal('No partner configuration found.');
      assert.notCalled(httpServiceMock.get);
    }
  });

  it('should throw BadRequestException when HTTP request fails', async () => {
    httpServiceMock.get.throws(new Error('HTTP Error'));

    try {
      await getVercelIntegrationProjects.execute({
        userId: session.user._id,
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        configurationId: 'test-config-id',
      });
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect(error.message).to.equal('HTTP Error');
      assert.called(httpServiceMock.get);
    }
  });
});
