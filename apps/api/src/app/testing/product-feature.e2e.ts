import { CommunityOrganizationRepository } from '@novu/dal';
import { ApiServiceLevelEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Product feature Test @skip-in-ee', async () => {
  let session: UserSession;
  const path = '/v1/testing/product-feature';
  let organizationRepository: CommunityOrganizationRepository;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    organizationRepository = new CommunityOrganizationRepository();
  });

  it('should return a number as response when required api service level exists on organization for feature', async () => {
    await organizationRepository.update(
      { _id: session.organization._id },
      {
        apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
      }
    );
    const { body } = await session.testAgent.get(path).set('authorization', `ApiKey ${session.apiKey}`).expect(200);
    expect(typeof body.data.number === 'number').to.be.true;
  });

  it('should return a 402 response when required api service level does not exists on organization for feature', async () => {
    const { body } = await session.testAgent.get(path).set('authorization', `ApiKey ${session.apiKey}`).expect(402);
    expect(body.statusCode).to.equal(402);
    expect(body.message).to.equal('Payment Required');
  });
});
