import { EnvironmentRepository } from '@novu/dal';
import { ApiServiceLevelEnum, EnvironmentTypeEnum, FeatureFlagsKeysEnum, NOVU_ENCRYPTION_SUB_MASK } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

async function createEnv(name: string, session) {
  const demoEnvironment = {
    name,
    color: '#3A7F5C',
  };
  const { body } = await session.testAgent.post('/v1/environments').send(demoEnvironment);

  return { demoEnvironment, body };
}

describe('Create Environment - /environments (POST)', async () => {
  let session: UserSession;
  const environmentRepository = new EnvironmentRepository();
  before(async () => {
    session = new UserSession();
    await session.initialize({
      noEnvironment: true,
    });
    session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

    // Enable the new change mechanism by default for normal tests
    (process.env as any).IS_NEW_CHANGE_MECHANISM_ENABLED = 'true';
  });

  after(async () => {
    // Clean up the feature flag
    delete (process.env as any).IS_NEW_CHANGE_MECHANISM_ENABLED;
  });

  it('should create environment entity correctly', async () => {
    const demoEnvironment = {
      name: 'Hello App',
      color: '#3A7F5C',
    };
    const { body } = await session.testAgent.post('/v1/environments').send(demoEnvironment).expect(201);

    expect(body.data.name).to.eq(demoEnvironment.name);
    expect(body.data._organizationId).to.eq(session.organization._id);
    expect(body.data.identifier).to.be.ok;
    const dbApp = await environmentRepository.findOne({ _id: body.data._id });

    if (!dbApp) {
      expect(dbApp).to.be.ok;
      throw new Error('App not found');
    }

    expect(dbApp.apiKeys.length).to.equal(1);
    expect(dbApp.apiKeys[0].key).to.be.ok;
    expect(dbApp.apiKeys[0].key).to.contains(NOVU_ENCRYPTION_SUB_MASK);
    expect(dbApp.apiKeys[0]._userId).to.equal(session.user._id);
  });

  it('should create environment with correct default type', async () => {
    const demoEnvironment = {
      name: 'Test Environment',
      color: '#3A7F5C',
    };
    const { body } = await session.testAgent.post('/v1/environments').send(demoEnvironment).expect(201);

    expect(body.data.name).to.eq(demoEnvironment.name);
    expect(body.data.type).to.eq(EnvironmentTypeEnum.PROD);

    const dbApp = await environmentRepository.findOne({ _id: body.data._id });
    expect(dbApp?.type).to.equal(EnvironmentTypeEnum.PROD);
  });

  it('should create Development environment with DEV type', async () => {
    const demoEnvironment = {
      name: 'Development',
      color: '#3A7F5C',
    };
    const { body } = await session.testAgent.post('/v1/environments').send(demoEnvironment).expect(201);

    expect(body.data.name).to.eq(demoEnvironment.name);
    expect(body.data.type).to.eq(EnvironmentTypeEnum.DEV);

    const dbApp = await environmentRepository.findOne({ _id: body.data._id });
    expect(dbApp?.type).to.equal(EnvironmentTypeEnum.DEV);
  });

  it('should create Production environment with PROD type', async () => {
    const demoEnvironment = {
      name: 'Production',
      color: '#3A7F5C',
    };
    const { body } = await session.testAgent.post('/v1/environments').send(demoEnvironment).expect(201);

    expect(body.data.name).to.eq(demoEnvironment.name);
    expect(body.data.type).to.eq(EnvironmentTypeEnum.PROD);

    const dbApp = await environmentRepository.findOne({ _id: body.data._id });
    expect(dbApp?.type).to.equal(EnvironmentTypeEnum.PROD);
  });

  it('should default custom environments to PROD type', async () => {
    const demoEnvironment = {
      name: 'Staging Environment',
      color: '#3A7F5C',
    };
    const { body } = await session.testAgent.post('/v1/environments').send(demoEnvironment).expect(201);

    expect(body.data.name).to.eq(demoEnvironment.name);
    expect(body.data.type).to.eq(EnvironmentTypeEnum.PROD);

    const dbApp = await environmentRepository.findOne({ _id: body.data._id });
    expect(dbApp?.type).to.equal(EnvironmentTypeEnum.PROD);
  });

  it('should create all environments with DEV type when IS_NEW_CHANGE_MECHANISM_ENABLED is disabled', async () => {
    // Set the feature flag to disabled
    (process.env as any).IS_NEW_CHANGE_MECHANISM_ENABLED = 'false';

    const testCases = [
      { name: 'Development', expectedType: EnvironmentTypeEnum.DEV },
      { name: 'Production', expectedType: EnvironmentTypeEnum.DEV },
      { name: 'Staging', expectedType: EnvironmentTypeEnum.DEV },
      { name: 'Custom Environment', expectedType: EnvironmentTypeEnum.DEV },
    ];

    for (const testCase of testCases) {
      const demoEnvironment = {
        name: testCase.name,
        color: '#3A7F5C',
      };
      const { body } = await session.testAgent.post('/v1/environments').send(demoEnvironment).expect(201);

      expect(body.data.name).to.eq(demoEnvironment.name);
      expect(body.data.type).to.eq(testCase.expectedType);

      const dbApp = await environmentRepository.findOne({ _id: body.data._id });
      expect(dbApp?.type).to.equal(testCase.expectedType);
    }

    // Reset the feature flag to enabled for other tests
    (process.env as any).IS_NEW_CHANGE_MECHANISM_ENABLED = 'true';
  });

  it('should apply default type to existing environments without type field', async () => {
    // Create an environment and manually remove the type field to simulate old data
    const demoEnvironment = {
      name: 'Legacy Environment',
      color: '#3A7F5C',
    };
    const { body } = await session.testAgent.post('/v1/environments').send(demoEnvironment).expect(201);

    // Manually remove the type field to simulate legacy data
    await environmentRepository.update({ _id: body.data._id }, { $unset: { type: 1 } });

    // Fetch the environment - should have default type applied
    const fetchedEnv = await environmentRepository.findOne({ _id: body.data._id });
    expect(fetchedEnv?.type).to.equal(EnvironmentTypeEnum.PROD);
  });

  it('should fail when no name provided', async () => {
    const demoEnvironment = {};
    const { body } = await session.testAgent.post('/v1/environments').send(demoEnvironment).expect(400);

    expect(body.message[0]).to.contain('name should not be null');
  });

  it('should create a default layout for environment', async () => {
    const demoEnvironment = {
      name: 'Hello App',
    };
    const { body } = await session.testAgent.post('/v1/environments').send(demoEnvironment).expect(201);
    session.environment = body.data;

    await session.fetchJWT();
    const { body: layouts } = await session.testAgent.get('/v1/layouts');

    expect(layouts.data.length).to.equal(1);
    expect(layouts.data[0].isDefault).to.equal(true);
    expect(layouts.data[0].content.length).to.be.greaterThan(20);
  });

  it('should not set apiRateLimits field on environment by default', async () => {
    const demoEnvironment = {
      name: 'Hello App',
    };
    const { body } = await session.testAgent.post('/v1/environments').send(demoEnvironment).expect(201);
    const dbEnvironment = await environmentRepository.findOne({ _id: body.data._id });

    expect(dbEnvironment?.apiRateLimits).to.be.undefined;
  });
});
