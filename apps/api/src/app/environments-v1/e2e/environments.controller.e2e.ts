import { Novu } from '@novu/api';
import { IntegrationRepository } from '@novu/dal';
import { ApiServiceLevelEnum, ChannelTypeEnum, EnvironmentEnum, InAppProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
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

    it('should default the in-app integration HMAC to ON for non-dev environments (NV-7593)', async () => {
      await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

      const { environmentRequestDto } = generateRandomEnvRequest();
      const createdEnv = await novuClient.environments.create(environmentRequestDto);
      expect(createdEnv.result).to.be.ok;

      const integrationRepository = new IntegrationRepository();
      const inAppIntegration = await integrationRepository.findOne({
        _organizationId: session.organization._id,
        _environmentId: createdEnv.result?.id!,
        providerId: InAppProviderIdEnum.Novu,
        channel: ChannelTypeEnum.IN_APP,
      });

      expect(inAppIntegration, 'in-app integration should be provisioned for the new environment').to.be.ok;
      expect(
        inAppIntegration?.credentials?.hmac,
        'HMAC must default to true for non-dev environments to prevent inbox session HMAC fail-open'
      ).to.equal(true);
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

  describe('Update Env Protection', () => {
    it('should prevent renaming Development environment', async () => {
      await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

      // Find the Development environment
      const environments = await novuClient.environments.list();
      const devEnvironment = environments.result?.find((env) => env.name === EnvironmentEnum.DEVELOPMENT);
      expect(devEnvironment).to.be.ok;

      // Try to update the Development environment name - should fail
      const { error } = await expectSdkExceptionGeneric(() =>
        novuClient.environments.update(
          {
            name: 'Custom Development Name',
          },
          devEnvironment?.id!
        )
      );

      expect(error).to.be.ok;
      expect(error?.message).to.include('Cannot update the name of Development or Production environments');
      expect(error?.statusCode).to.equal(422);
    });

    it('should prevent renaming Production environment', async () => {
      await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

      // Find the Production environment
      const environments = await novuClient.environments.list();
      const prodEnvironment = environments.result?.find((env) => env.name === EnvironmentEnum.PRODUCTION);
      expect(prodEnvironment).to.be.ok;

      // Try to update the Production environment name - should fail
      const { error } = await expectSdkExceptionGeneric(() =>
        novuClient.environments.update(
          {
            name: 'Custom Production Name',
          },
          prodEnvironment?.id!
        )
      );

      expect(error).to.be.ok;
      expect(error?.message).to.include('Cannot update the name of Development or Production environments');
      expect(error?.statusCode).to.equal(422);
    });

    it('should allow updating other properties of protected environments', async () => {
      await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

      // Find the Development environment
      const environments = await novuClient.environments.list();
      const devEnvironment = environments.result?.find((env) => env.name === EnvironmentEnum.DEVELOPMENT);
      expect(devEnvironment).to.be.ok;

      // Should be able to update color without changing name
      const updatedEnv = await novuClient.environments.update(
        {
          color: '#ff0000',
        },
        devEnvironment?.id!
      );

      expect(updatedEnv.result).to.be.ok;
      expect(updatedEnv.result?.name).to.equal(EnvironmentEnum.DEVELOPMENT); // Name should remain unchanged
    });

    it('should allow renaming custom environments', async () => {
      await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

      // Create a custom environment
      const { environmentRequestDto } = generateRandomEnvRequest();
      const createdEnv = await novuClient.environments.create(environmentRequestDto);
      expect(createdEnv.result).to.be.ok;

      // Should be able to update custom environment name
      const newName = generateRandomName('updated-env');
      const updatedEnv = await novuClient.environments.update(
        {
          name: newName,
        },
        createdEnv.result?.id!
      );

      expect(updatedEnv.result).to.be.ok;
      expect(updatedEnv.result?.name).to.equal(newName);
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
