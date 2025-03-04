import { ClerkClient, createClerkClient } from '@clerk/backend';
import { clerk, clerkSetup } from '@clerk/testing/playwright';
import { Page } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { DalService, EnvironmentEntity, OrganizationEntity, UserEntity } from '@novu/dal';

import { UserService } from './user-service';
import { OrganizationService } from './organization-service';
import { EnvironmentService } from './environment-service';
import { IntegrationService } from './integration-service';

export class Session {
  private dal: DalService;
  private clerkClient: ClerkClient;
  private userService: UserService;
  private organizationService: OrganizationService;
  private environmentService: EnvironmentService;
  public user: UserEntity;
  public organization: OrganizationEntity;
  public developmentEnvironment: EnvironmentEntity;
  public productionEnvironment: EnvironmentEntity;
  private integrationService: IntegrationService;

  constructor(private page: Page) {
    this.dal = new DalService();
    this.clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    this.userService = new UserService(this.clerkClient);
    this.organizationService = new OrganizationService(this.clerkClient);
    this.environmentService = new EnvironmentService();
    this.integrationService = new IntegrationService();
  }

  async initialize() {
    await this.dal.connect(process.env.MONGO_URL ?? '');

    const emailPrefix = faker.internet.email().split('@')[0];
    const email = `${emailPrefix}@novu.co`;
    const password = faker.internet.password();

    const clerkUser = await this.userService.createClerkUser({
      email,
      password,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    });
    this.user = await this.userService.createNovuUser({ externalId: clerkUser.id });

    const clerkOrganization = await this.organizationService.createClerkOrganization({
      name: faker.company.name(),
      createdBy: clerkUser.id,
    });
    this.organization = await this.organizationService.createNovuOrganization({
      externalId: clerkOrganization.id,
    });

    const { development, production } = await this.environmentService.createDevAndProdEnvironments({
      organizationId: this.organization._id,
      userId: this.user._id,
    });
    this.developmentEnvironment = development;
    this.productionEnvironment = production;

    await this.integrationService.createInAppIntegration({
      organizationId: this.organization._id,
      environmentId: this.developmentEnvironment._id,
    });
    await this.integrationService.createInAppIntegration({
      organizationId: this.organization._id,
      environmentId: this.productionEnvironment._id,
    });

    await clerkSetup();

    await this.page.goto('/');

    await clerk.signIn({
      page: this.page,
      signInParams: {
        strategy: 'password',
        identifier: email,
        password,
      },
    });

    await this.page.goto('/');
  }

  async teardown() {
    await this.userService.deleteClerkUser(this.user.externalId);
    await this.organizationService.deleteClerkOrganization(this.organization.externalId);
    await this.dal.disconnect();
  }

  async getJwt() {
    const sessions = await this.clerkClient.sessions.getSessionList({
      userId: this.user.externalId,
    });
    const token = await this.clerkClient.sessions.getToken(sessions.data[0].id, 'e2e_tests');

    return token.jwt;
  }
}
