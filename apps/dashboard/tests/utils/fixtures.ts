import { test as base } from '@playwright/test';
import { UserEntity, OrganizationEntity, EnvironmentEntity } from '@novu/dal';

import { Session } from './session';

export const test = base.extend<{
  session: {
    user: UserEntity;
    jwt: string;
    organization: OrganizationEntity;
    developmentEnvironment: EnvironmentEntity;
    productionEnvironment: EnvironmentEntity;
  };
  apiClient: any;
}>({
  session: [
    async ({ page }, use) => {
      const session = new Session(page);
      await session.initialize();
      const jwt = await session.getJwt();

      await use({
        user: session.user,
        jwt,
        organization: session.organization,
        developmentEnvironment: session.developmentEnvironment,
        productionEnvironment: session.productionEnvironment,
      });

      await session.teardown();
    },
    { auto: true },
  ],
});
