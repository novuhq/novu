import { ApiServiceLevelEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { expectSdkExceptionGeneric, initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Env Controller', async () => {
  let session: UserSession;
  let novuClient: Novu;
  before(async () => {
    session = new UserSession();
    await session.initialize({});
    novuClient = initNovuClassSdkInternalAuth(session);
  });
  describe('Create Env', () => {
    [ApiServiceLevelEnum.BUSINESS, ApiServiceLevelEnum.ENTERPRISE].forEach((serviceLevel) => {
      it(`should be able to create env in ${serviceLevel} tier`, async () => {
        await session.updateOrganizationServiceLevel(serviceLevel);
        const { name, environmentRequestDto } = generateRandomEnvRequest();
        const createdEnv = await novuClient.environments.create(environmentRequestDto);
        const { result } = createdEnv;
        expect(result).to.be.ok;
        expect(result.name).to.equal(name);
      });
    });

    [ApiServiceLevelEnum.PRO, ApiServiceLevelEnum.FREE].forEach((serviceLevel) => {
      it(`should not be able to create env in ${serviceLevel} tier`, async () => {
        await session.updateOrganizationServiceLevel(serviceLevel);
        const { error, successfulBody } = await expectSdkExceptionGeneric(() =>
          novuClient.environments.create(generateRandomEnvRequest().environmentRequestDto)
        );
        expect(error).to.be.ok;
        expect(error?.message).to.equal('Payment Required');
        expect(error?.statusCode).to.equal(402);
      });
    });
  });
  function generateRandomEnvRequest() {
    const name = generateRandomName('env');
    const parentId = session.environment._id;
    const environmentRequestDto = {
      name,
      parentId,
      color: '#b15353',
    };

    return { name, parentId, environmentRequestDto };
  }
});
function generateRandomName(prefix: string = 'env'): string {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 7);

  return `${prefix}-${randomPart}-${timestamp}`;
}
