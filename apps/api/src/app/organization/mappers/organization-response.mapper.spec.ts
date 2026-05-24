import { PartnerTypeEnum } from '@novu/dal';
import { expect } from 'chai';

import { toOrganizationPublicResponse } from './organization-response.mapper';

describe('toOrganizationPublicResponse', () => {
  it('should remove access tokens from partner configurations', () => {
    const organization = {
      _id: 'org-id',
      name: 'Test Org',
      apiServiceLevel: 'free',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      partnerConfigurations: [
        {
          accessToken: 'secret-vercel-token',
          configurationId: 'config-id',
          teamId: 'team-id',
          partnerType: PartnerTypeEnum.VERCEL,
          projectIds: ['project-id'],
        },
      ],
    };

    const response = toOrganizationPublicResponse(organization as never);

    expect(response?.partnerConfigurations).to.deep.equal([
      {
        configurationId: 'config-id',
        teamId: 'team-id',
        partnerType: PartnerTypeEnum.VERCEL,
        projectIds: ['project-id'],
      },
    ]);
    expect(JSON.stringify(response)).to.not.include('secret-vercel-token');
  });

  it('should return null and undefined unchanged', () => {
    expect(toOrganizationPublicResponse(null)).to.equal(null);
    expect(toOrganizationPublicResponse(undefined)).to.equal(undefined);
  });
});
