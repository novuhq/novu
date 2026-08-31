import { EnvironmentRepository } from '@novu/dal';
import { ApiServiceLevelEnum, EnvironmentEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Update Environment API key environment scope - PUT /environments/:environmentId #novu-v2', () => {
  let session: UserSession;
  const environmentRepository = new EnvironmentRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);
  });

  it('should forbid updating a sibling environment via API key', async () => {
    const {
      body: { data: createdEnv },
    } = await session.testAgent.post('/v1/environments').send({
      name: 'Sibling Env To Update',
      color: '#ff0000',
    });

    expect(createdEnv._id, 'Expected custom environment to be created').to.exist;

    const { body } = await session.testAgent
      .put(`/v1/environments/${createdEnv._id}`)
      .set('authorization', `ApiKey ${session.apiKey}`)
      .send({
        identifier: 'compromised-sibling',
        color: '#0000ff',
        bridge: { url: 'https://attacker.example/api/novu' },
      });

    expect(body.statusCode).to.equal(403);
    expect(body.message).to.contain('is scoped to a single environment');

    const stored = await environmentRepository.findOne({ _id: createdEnv._id });
    expect(stored?.identifier).to.not.equal('compromised-sibling');
    expect(stored?.color).to.not.equal('#0000ff');
    expect(stored?.bridge?.url || stored?.echo?.url || '').to.not.equal('https://attacker.example/api/novu');
  });

  it('should forbid updating Production via a Development API key', async () => {
    const {
      body: { data: environments },
    } = await session.testAgent.get('/v1/environments');
    const production = environments.find((environment: { name: string }) => environment.name === EnvironmentEnum.PRODUCTION);

    expect(production?._id, 'Expected Production environment').to.exist;
    expect(production._id).to.not.equal(session.environment._id);

    const original = await environmentRepository.findOne({ _id: production._id });

    const { body } = await session.testAgent
      .put(`/v1/environments/${production._id}`)
      .set('authorization', `ApiKey ${session.apiKey}`)
      .send({
        identifier: 'compromised-production',
        bridge: { url: 'https://attacker.example/api/novu' },
      });

    expect(body.statusCode).to.equal(403);
    expect(body.message).to.contain('is scoped to a single environment');

    const stored = await environmentRepository.findOne({ _id: production._id });
    expect(stored?.identifier).to.equal(original?.identifier);
    expect(stored?.bridge?.url || '').to.equal(original?.bridge?.url || '');
    expect(stored?.echo?.url || '').to.equal(original?.echo?.url || '');
  });

  it('should allow an API key to update its own environment', async () => {
    const { status } = await session.testAgent
      .put(`/v1/environments/${session.environment._id}`)
      .set('authorization', `ApiKey ${session.apiKey}`)
      .send({
        identifier: 'own-env-via-api-key',
        color: '#3366ff',
      });

    expect(status).to.equal(200);

    const stored = await environmentRepository.findOne({ _id: session.environment._id });
    expect(stored?.identifier).to.equal('own-env-via-api-key');
    expect(stored?.color).to.equal('#3366ff');
  });

  it('should allow bearer auth to update a sibling environment in the same org', async () => {
    const {
      body: { data: createdEnv },
    } = await session.testAgent.post('/v1/environments').send({
      name: 'Bearer Updatable Env',
      color: '#00ff00',
    });

    expect(createdEnv._id, 'Expected custom environment to be created').to.exist;

    const { status } = await session.testAgent.put(`/v1/environments/${createdEnv._id}`).send({
      identifier: 'bearer-updated-sibling',
      color: '#112233',
    });

    expect(status).to.equal(200);

    const stored = await environmentRepository.findOne({ _id: createdEnv._id });
    expect(stored?.identifier).to.equal('bearer-updated-sibling');
    expect(stored?.color).to.equal('#112233');
  });
});
