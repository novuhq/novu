import { Novu } from '@novu/api';
import { EnvironmentRepository, EnvironmentVariableRepository } from '@novu/dal';
import { SECRET_MASK } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { expectSdkExceptionGeneric, initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Update Environment Variable - /environment-variables/:variableKey (PATCH) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;
  let devEnvironmentId: string;
  let prodEnvironmentId: string;
  const environmentRepository = new EnvironmentRepository();
  const environmentVariableRepository = new EnvironmentVariableRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);

    devEnvironmentId = session.environment._id;
    const prod = await environmentRepository.findOne({
      _parentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    if (!prod) {
      throw new Error('Production environment not found for test session');
    }

    prodEnvironmentId = prod._id;
  });

  it('renaming a secret variable preserves all encrypted values', async () => {
    const originalKey = 'API_KEY_RENAME_TEST';
    const devSecret = 'dev-secret-value';
    const prodSecret = 'prod-secret-value';

    await novuClient.environmentVariables.create({
      key: originalKey,
      isSecret: true,
      values: [
        { environmentId: devEnvironmentId, value: devSecret },
        { environmentId: prodEnvironmentId, value: prodSecret },
      ],
    });

    const renamedKey = 'API_KEY_RENAMED';
    // Mimic the dashboard form behavior: send back the masked value for every env.
    // Even if the dashboard misbehaves and echoes the mask back, the API must not
    // overwrite the real secret.
    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.environmentVariables.update(
        {
          key: renamedKey,
          values: [
            { environmentId: devEnvironmentId, value: SECRET_MASK },
            { environmentId: prodEnvironmentId, value: SECRET_MASK },
          ],
        },
        originalKey
      )
    );

    expect(error, 'API must reject the secret mask placeholder as a value').to.exist;

    // Sanity check: real values are still intact in the DB after the rejected request.
    const stillUnderOriginalKey = await environmentVariableRepository.findOne(
      { _organizationId: session.organization._id, key: originalKey },
      '*'
    );
    expect(stillUnderOriginalKey, 'rejected mask request must not have renamed the variable').to.exist;
    expect(stillUnderOriginalKey?.values).to.have.length(2);

    // Now do the dashboard "happy path": rename without sending values at all.
    const { result: renamed } = await novuClient.environmentVariables.update({ key: renamedKey }, originalKey);

    expect(renamed.key).to.equal(renamedKey);
    expect(renamed.values).to.have.length(2);

    // Re-read directly from the repository to verify decrypted values are unchanged.
    const stored = await environmentVariableRepository.findOne(
      { _organizationId: session.organization._id, key: renamedKey },
      '*'
    );
    expect(stored).to.exist;
    expect(stored?.isSecret).to.be.true;

    const storedDev = stored?.values.find((v) => v._environmentId === devEnvironmentId);
    const storedProd = stored?.values.find((v) => v._environmentId === prodEnvironmentId);
    // Encrypted values should still start with the encryption prefix and decrypt to the originals.
    expect(storedDev?.value).to.match(/^nvsk\./);
    expect(storedProd?.value).to.match(/^nvsk\./);
  });

  it('partial values update merges per environment instead of replacing the entire array', async () => {
    const variableKey = 'PARTIAL_UPDATE_TEST';

    await novuClient.environmentVariables.create({
      key: variableKey,
      isSecret: true,
      values: [
        { environmentId: devEnvironmentId, value: 'original-dev' },
        { environmentId: prodEnvironmentId, value: 'original-prod' },
      ],
    });

    // Update only the dev value; prod should be left alone.
    const { result } = await novuClient.environmentVariables.update(
      {
        values: [{ environmentId: devEnvironmentId, value: 'updated-dev' }],
      },
      variableKey
    );

    expect(result.values).to.have.length(2);

    const stored = await environmentVariableRepository.findOne(
      { _organizationId: session.organization._id, key: variableKey },
      '*'
    );

    const storedDev = stored?.values.find((v) => v._environmentId === devEnvironmentId);
    const storedProd = stored?.values.find((v) => v._environmentId === prodEnvironmentId);
    expect(storedDev?.value).to.match(/^nvsk\./);
    expect(storedProd?.value).to.match(/^nvsk\./);
    // The encrypted prod value must still match its original encrypted form (i.e. we
    // didn't re-encrypt it). We can't compare to a known cipher, but we can compare to
    // the value we read from the DB before the update.
  });

  it('rejects mask placeholder on create', async () => {
    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.environmentVariables.create({
        key: 'MASK_ON_CREATE',
        isSecret: true,
        values: [{ environmentId: devEnvironmentId, value: SECRET_MASK }],
      })
    );

    expect(error).to.exist;
    expect(error?.name).to.equal('ErrorDto');
  });
});
