import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { createHash } from 'crypto';

import { UserSession } from '@novu/testing';
import { ChannelTypeEnum } from '@novu/stateless';
import { EnvironmentRepository } from '@novu/dal';
import { decryptApiKey } from '@novu/application-generic';

import { encryptApiKeysMigration } from './encrypt-api-keys-migration';

async function pruneIntegration({ environmentRepository }: { environmentRepository: EnvironmentRepository }) {
  const old = await environmentRepository.find({});

  for (const oldKey of old) {
    await environmentRepository.delete({ _id: oldKey._id });
  }
}

describe('Encrypt Old api keys', function () {
  let session: UserSession;
  const environmentRepository = new EnvironmentRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should decrypt all old api keys', async function () {
    await pruneIntegration({ environmentRepository });

    for (let i = 0; i < 2; i++) {
      await environmentRepository.create({
        identifier: 'identifier' + i,
        name: faker.name.jobTitle(),
        _organizationId: session.organization._id,
        apiKeys: [
          {
            key: 'not-encrypted-secret-key',
            _userId: session.user._id,
          },
        ],
      });
    }

    const newEnvironments = await environmentRepository.find({});

    expect(newEnvironments.length).to.equal(2);

    for (const environment of newEnvironments) {
      expect(environment.identifier).to.contains('identifier');
      expect(environment.name).to.exist;
      expect(environment._organizationId).to.equal(session.organization._id);
      expect(environment.apiKeys[0].key).to.equal('not-encrypted-secret-key');
      expect(environment.apiKeys[0].hash).to.not.exist;
      expect(environment.apiKeys[0]._userId).to.equal(session.user._id);
    }

    await encryptApiKeysMigration();

    const encryptEnvironments = await environmentRepository.find({});

    for (const environment of encryptEnvironments) {
      const decryptedApiKey = decryptApiKey(environment.apiKeys[0].key);
      const hashedApiKey = createHash('sha256').update(decryptedApiKey).digest('hex');

      expect(environment.identifier).to.contains('identifier');
      expect(environment.name).to.exist;
      expect(environment._organizationId).to.equal(session.organization._id);
      expect(environment.apiKeys[0].key).to.contains('nvsk.');
      expect(environment.apiKeys[0].hash).to.equal(hashedApiKey);
      expect(environment.apiKeys[0]._userId).to.equal(session.user._id);
    }
  });

  it('should validate migration idempotence', async function () {
    await pruneIntegration({ environmentRepository });

    const data = {
      providerId: 'sendgrid',
      channel: ChannelTypeEnum.EMAIL,
      active: false,
    };

    for (let i = 0; i < 2; i++) {
      await environmentRepository.create({
        identifier: 'identifier' + i,
        name: faker.name.jobTitle(),
        _organizationId: session.organization._id,
        apiKeys: [
          {
            key: 'not-encrypted-secret-key',
            _userId: session.user._id,
          },
        ],
      });
    }

    await encryptApiKeysMigration();
    const firstMigrationExecution = await environmentRepository.find({});

    await encryptApiKeysMigration();
    const secondMigrationExecution = await environmentRepository.find({});

    expect(firstMigrationExecution[0].identifier).to.contains(secondMigrationExecution[0].identifier);
    expect(firstMigrationExecution[0].name).to.exist;
    expect(firstMigrationExecution[0]._organizationId).to.equal(secondMigrationExecution[0]._organizationId);
    expect(firstMigrationExecution[0].apiKeys[0].key).to.contains(secondMigrationExecution[0].apiKeys[0].key);
    expect(firstMigrationExecution[0].apiKeys[0].hash).to.contains(secondMigrationExecution[0].apiKeys[0].hash);
    expect(firstMigrationExecution[0].apiKeys[0]._userId).to.equal(secondMigrationExecution[0].apiKeys[0]._userId);

    expect(firstMigrationExecution[1].identifier).to.contains(secondMigrationExecution[1].identifier);
    expect(firstMigrationExecution[1].name).to.exist;
    expect(firstMigrationExecution[1]._organizationId).to.equal(secondMigrationExecution[1]._organizationId);
    expect(firstMigrationExecution[1].apiKeys[0].key).to.contains(secondMigrationExecution[1].apiKeys[0].key);
    expect(firstMigrationExecution[1].apiKeys[0].hash).to.contains(secondMigrationExecution[1].apiKeys[0].hash);
    expect(firstMigrationExecution[1].apiKeys[0]._userId).to.equal(secondMigrationExecution[1].apiKeys[0]._userId);
  });
});
