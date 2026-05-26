import { EnvironmentRepository } from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';
import { PinoLogger } from '@novu/application-generic';

import { GetMyEnvironmentsCommand } from './get-my-environments.command';
import { GetMyEnvironments } from './get-my-environments.usecase';

describe('GetMyEnvironments', () => {
  const environmentRepository = new EnvironmentRepository();
  const logger = { setContext: sinon.stub(), trace: sinon.stub() } as unknown as PinoLogger;
  const getMyEnvironments = new GetMyEnvironments(environmentRepository, logger);

  let findOrganizationEnvironmentsStub: sinon.SinonStub;

  beforeEach(() => {
    findOrganizationEnvironmentsStub = sinon.stub(environmentRepository, 'findOrganizationEnvironments');
    findOrganizationEnvironmentsStub.resolves([
      {
        _id: 'env-dev',
        name: 'Development',
        _organizationId: 'org-1',
        apiKeys: [{ key: 'encrypted-dev', _userId: 'user-1', hash: 'hash-dev' }],
      },
      {
        _id: 'env-prod',
        name: 'Production',
        _organizationId: 'org-1',
        apiKeys: [{ key: 'encrypted-prod', _userId: 'user-1', hash: 'hash-prod' }],
      },
    ]);

    sinon.stub(getMyEnvironments as unknown as { decryptApiKeys: () => unknown }, 'decryptApiKeys').callsFake((apiKeys) =>
      apiKeys.map((apiKey: { key: string }) => ({
        ...apiKey,
        key: `decrypted-${apiKey.key}`,
      }))
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return apiKeys only for the scoped environment when apiKeysEnvironmentId is set', async () => {
    const result = await getMyEnvironments.execute(
      GetMyEnvironmentsCommand.create({
        organizationId: 'org-1',
        returnApiKeys: true,
        apiKeysEnvironmentId: 'env-dev',
      })
    );

    const devEnvironment = result.find((environment) => environment._id === 'env-dev');
    const prodEnvironment = result.find((environment) => environment._id === 'env-prod');

    expect(devEnvironment?.apiKeys).to.have.lengthOf(1);
    expect(devEnvironment?.apiKeys[0].key).to.equal('decrypted-encrypted-dev');
    expect(prodEnvironment?.apiKeys).to.have.lengthOf(0);
  });

  it('should return apiKeys for every environment when apiKeysEnvironmentId is not set', async () => {
    const result = await getMyEnvironments.execute(
      GetMyEnvironmentsCommand.create({
        organizationId: 'org-1',
        returnApiKeys: true,
      })
    );

    for (const environment of result) {
      expect(environment.apiKeys).to.have.lengthOf(1);
      expect(environment.apiKeys[0].key).to.match(/^decrypted-/);
    }
  });

  it('should not return apiKeys for any environment when returnApiKeys is false', async () => {
    const result = await getMyEnvironments.execute(
      GetMyEnvironmentsCommand.create({
        organizationId: 'org-1',
        returnApiKeys: false,
        apiKeysEnvironmentId: 'env-dev',
      })
    );

    for (const environment of result) {
      expect(environment.apiKeys).to.have.lengthOf(0);
    }
  });
});
