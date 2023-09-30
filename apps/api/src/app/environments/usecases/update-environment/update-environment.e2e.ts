import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { UpdateEnvironmentRequestDto } from '../../dtos/update-environment-request.dto';

describe('Update Environment - /environments (PUT)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should update environment entity correctly', async () => {
    const updatePayload: UpdateEnvironmentRequestDto = {
      name: 'New Name',
      identifier: 'New Identifier',
    };

    await session.testAgent.put(`/v1/environments/${session.environment._id}`).send(updatePayload).expect(200);
    const { body } = await session.testAgent.get('/v1/environments/me');

    expect(body.data.name).to.eq(updatePayload.name);
    expect(body.data.identifier).to.equal(updatePayload.identifier);
  });
});
