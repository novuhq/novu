import { Test } from '@nestjs/testing';
import { OrganizationRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { assert, restore, stub } from 'sinon';

import { GetVercelIntegration } from './get-vercel-integration.usecase';

describe('GetVercelIntegration', () => {
  let getVercelIntegration: GetVercelIntegration;
  let session: UserSession;
  let organizationRepositoryMock;

  beforeEach(async () => {
    organizationRepositoryMock = {
      findByPartnerConfigurationId: stub().resolves([
        {
          _id: 'org-id-1',
          partnerConfigurations: [
            {
              projectIds: ['project-1', 'project-2'],
            },
          ],
        },
        {
          _id: 'org-id-2',
          partnerConfigurations: [
            {
              projectIds: ['project-2', 'project-3'],
            },
          ],
        },
      ]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        GetVercelIntegration,
        {
          provide: OrganizationRepository,
          useValue: organizationRepositoryMock,
        },
      ],
    }).compile();

    session = new UserSession();
    await session.initialize();
    getVercelIntegration = moduleRef.get<GetVercelIntegration>(GetVercelIntegration);
  });

  afterEach(() => {
    restore();
  });

  it('should get vercel configuration details', async () => {
    const command = {
      userId: session.user._id,
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      configurationId: 'test-config-id',
    };

    const result = await getVercelIntegration.execute(command);

    expect(result).to.be.an('array');
    expect(result[0]).to.deep.equal({
      organizationId: 'org-id-1',
      projectIds: ['project-1', 'project-2'],
    });
    expect(result[1]).to.deep.equal({
      organizationId: 'org-id-2',
      projectIds: ['project-2', 'project-3'],
    });

    assert.calledOnceWithExactly(organizationRepositoryMock.findByPartnerConfigurationId, {
      userId: command.userId,
      configurationId: command.configurationId,
    });
  });

  it('should return empty array when no configurations found', async () => {
    organizationRepositoryMock.findByPartnerConfigurationId.resolves([]);

    const command = {
      userId: session.user._id,
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      configurationId: 'test-config-id',
    };

    const result = await getVercelIntegration.execute(command);

    expect(result).to.be.an('array');
    expect(result).to.have.length(0);

    assert.calledOnceWithExactly(organizationRepositoryMock.findByPartnerConfigurationId, {
      userId: command.userId,
      configurationId: command.configurationId,
    });
  });
});
