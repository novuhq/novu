import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { UpdateEnvironmentRequestDto } from '../../dtos/update-environment-request.dto';

describe('Update Environment - /environments (PUT)', async () => {
  let session: UserSession;
  let createdEnv: EnvironmentEntity;
  const environmentRepository = new EnvironmentRepository();
  const demoEnvironment = {
    name: 'Hello App',
  };

  before(async () => {
    session = new UserSession();
    await session.initialize({
      noEnvironment: true,
    });

    createdEnv = await environmentRepository.create(demoEnvironment);
  });

  it('should update environment entity correctly', async () => {
    const updatePayload: UpdateEnvironmentRequestDto = {
      name: 'New Name',
      identifier: 'New Identifier',
    };
    const { body } = await session.testAgent.put(`/v1/environments/${createdEnv._id}`).send(updatePayload).expect(200);

    expect(body.data.name).to.eq(updatePayload.name);
    expect(body.data._organizationId).to.eq(session.organization._id);
    expect(body.data.identifier).to.eq(updatePayload.identifier);
  });
});
