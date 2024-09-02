import {
  DalService,
  IntegrationRepository,
  NotificationGroupRepository,
  NotificationTemplateEntity,
  EnvironmentEntity,
  OrganizationEntity,
  UserEntity,
} from '@novu/dal';
import { ChannelTypeEnum, getPopularTemplateIds, MemberStatusEnum, ProvidersIdEnum } from '@novu/shared';
import {
  CreateTemplatePayload,
  EnvironmentService,
  JobsService,
  NotificationsService,
  NotificationTemplateService,
  OrganizationService,
  SubscribersService,
  UserService,
  UserSession,
} from '@novu/testing';
import { Page } from '@playwright/test';

export interface SessionData {
  token: string;
  user: UserEntity;
  organization: OrganizationEntity;
  environment: EnvironmentEntity;
  templates: NotificationTemplateEntity[]; // You can replace 'any' with a more specific type if needed
}

export interface OverrideSessionOptions {
  singleTokenInjection?: boolean;
  page?: Page;
}

export interface ISessionOptions {
  noEnvironment?: boolean;
  partialTemplate?: Partial<NotificationTemplateEntity>;
  noTemplates?: boolean;
  showOnBoardingTour?: boolean;
  overrideSessionOptions?: OverrideSessionOptions;
  shouldSkipLogin?: boolean;
}

export async function getSession(settings: ISessionOptions = {}): Promise<SessionData> {
  const dal = new DalService();
  await dal.connect(process.env.MONGODB_URL ?? '');

  const session = new UserSession('http://127.0.0.1:1336');
  await session.initialize({
    noEnvironment: settings?.noEnvironment,
    showOnBoardingTour: settings?.showOnBoardingTour,
  });

  const notificationTemplateService = new NotificationTemplateService(
    session.user._id,
    session.organization._id,
    session.environment._id as string
  );

  let templates;
  if (!settings?.noTemplates) {
    const templatePartial = settings?.partialTemplate || {};

    templates = await Promise.all([
      notificationTemplateService.createTemplate({ ...(templatePartial as any) }),
      notificationTemplateService.createTemplate({
        active: false,
        draft: true,
      }),
      notificationTemplateService.createTemplate(),
      notificationTemplateService.createTemplate(),
      notificationTemplateService.createTemplate(),
      notificationTemplateService.createTemplate(),
    ]);
  }

  return {
    token: session.token.split(' ')[1],
    user: session.user,
    organization: session.organization,
    environment: session.environment,
    templates,
  };
}

export async function deleteProvider(query: {
  providerId: ProvidersIdEnum;
  channel: ChannelTypeEnum;
  environmentId: string;
  organizationId: string;
}) {
  const dal = new DalService();
  await dal.connect(process.env.MONGODB_URL ?? '');

  const repository = new IntegrationRepository();

  return await repository.deleteMany({
    channel: query.channel,
    providerId: query.providerId,
    _environmentId: query.environmentId,
    _organizationId: query.organizationId,
  });
}

export async function createNotifications({
  identifier,
  token,
  count = 1,
  subscriberId,
  environmentId,
  organizationId,
  templateId,
}: {
  identifier: string;
  token: string;
  count?: number;
  subscriberId?: string;
  environmentId: string;
  organizationId: string;
  templateId?: string;
}) {
  const jobsService = new JobsService();
  let subId = subscriberId;
  if (!subId) {
    const subscribersService = new SubscribersService(organizationId, environmentId);
    const subscriber = await subscribersService.createSubscriber();
    subId = subscriber.subscriberId;
  }

  const triggerIdentifier = identifier;
  const service = new NotificationsService(token, environmentId);
  const session = new UserSession(process.env.REACT_APP_API_URL);

  for (let i = 0; i < count; i += 1) {
    await service.triggerEvent(triggerIdentifier, subId, {});
  }

  if (organizationId) {
    await session.awaitRunningJobs(templateId, undefined, 0, organizationId);
  }

  while ((await jobsService.standardQueue.getWaitingCount()) || (await jobsService.standardQueue.getActiveCount())) {
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
  }

  return 'ok';
}

/*
 * Use only before or after the suite execution. Do not drop the database in tests as
 * it will break parallel test runs.
 */
export async function dropDatabase() {
  const dal = new DalService();
  await dal.connect(process.env.MONGODB_URL ?? '');
  await dal.destroy();

  return true;
}

export async function createUser(): Promise<UserEntity> {
  const dal = new DalService();
  await dal.connect(process.env.MONGODB_URL ?? '');

  const userService = new UserService();

  return await userService.createTestUser();
}

export function randomEmail() {
  return new UserService().randomEmail();
}

export function randomPassword() {
  return new UserService().randomPassword();
}

export function testPassword() {
  return new UserService().testPassword();
}

export async function addOrganization(userId: string) {
  const dal = new DalService();
  await dal.connect(process.env.MONGODB_URL ?? '');
  const organizationService = new OrganizationService();

  const organization = await organizationService.createOrganization();
  await organizationService.addMember(organization._id as string, userId);

  return organization;
}

export async function createWorkflows({
  userId,
  organizationId,
  environmentId,
  workflows,
}: {
  userId: string;
  organizationId: string;
  environmentId: string;
  workflows: Partial<CreateTemplatePayload>[];
}) {
  const dal = new DalService();
  await dal.connect(process.env.MONGODB_URL ?? '');

  const notificationTemplateService = new NotificationTemplateService(userId, organizationId, environmentId);

  return Promise.all(workflows.map((workflow) => notificationTemplateService.createTemplate(workflow)));
}

export async function inviteUser(
  session: SessionData,
  email: string
): Promise<{ token: string; inviter: any; organization: any }> {
  const apiUrl = process.env.REACT_APP_API_URL;

  const inviteResponse = await fetch(`${apiUrl}/v1/invites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
      'Novu-Environment-Id': session.environment._id,
    },
    body: JSON.stringify({
      email,
      role: 'ADMIN',
    }),
  });

  if (!inviteResponse.ok) {
    throw new Error(`Failed to send invite: ${await inviteResponse.text()}`);
  }

  const membersResponse = await fetch(`${apiUrl}/v1/organizations/members`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.token}`,
      'Novu-Environment-Id': session.environment._id,
    },
  });

  if (!membersResponse.ok) {
    throw new Error(`Failed to fetch members: ${await membersResponse.text()}`);
  }

  const membersData = await membersResponse.json();
  const invitedMember = membersData.data.find((member) => member.memberStatus === MemberStatusEnum.INVITED);

  if (!invitedMember || !invitedMember.invite.token) {
    throw new Error('No invited member found or no token available');
  }

  return {
    token: invitedMember.invite.token,
    inviter: session.user,
    organization: session.organization,
  };
}

export async function populateBlueprints() {
  const dal = new DalService();
  await dal.connect(process.env.MONGODB_URL ?? '');

  const userService = new UserService();
  const user = await userService.createUser();

  const notificationGroupRepository = new NotificationGroupRepository();
  const organizationService = new OrganizationService();
  const environmentService = new EnvironmentService();

  let organization = await organizationService.getOrganization(process.env.BLUEPRINT_CREATOR ?? '');

  if (!organization) {
    organization = await organizationService.createOrganization({ _id: process.env.BLUEPRINT_CREATOR });
  }

  const organizationId = organization._id;

  let developmentEnvironment = await environmentService.getDevelopmentEnvironment(organizationId);
  if (!developmentEnvironment) {
    developmentEnvironment = await environmentService.createDevelopmentEnvironment(organizationId, user._id);
  }

  let productionEnvironment = await environmentService.getProductionEnvironment(organizationId);
  if (!productionEnvironment) {
    productionEnvironment = await environmentService.createProductionEnvironment(
      organizationId,
      user._id,
      developmentEnvironment._id
    );
  }

  const productionEnvironmentId = productionEnvironment._id;

  const productionGeneralGroup = await notificationGroupRepository.findOne({
    name: 'General',
    _environmentId: productionEnvironmentId,
    _organizationId: organizationId,
  });
  const productionGetStartedGroup = await notificationGroupRepository.findOne({
    name: 'Get started',
    _environmentId: productionEnvironmentId,
    _organizationId: organizationId,
  });

  if (!productionGeneralGroup) {
    await notificationGroupRepository.create({
      name: 'General',
      _environmentId: productionEnvironmentId,
      _organizationId: organizationId,
    });
  }
  if (!productionGetStartedGroup) {
    await notificationGroupRepository.create({
      name: 'Get started',
      _environmentId: productionEnvironmentId,
      _organizationId: organizationId,
    });
  }

  const productionNotificationTemplateService = new NotificationTemplateService(
    user._id,
    organizationId,
    productionEnvironmentId
  );

  const popularTemplateIds = getPopularTemplateIds({ production: false });

  const blueprintTemplates = await productionNotificationTemplateService.getBlueprintTemplates(
    organizationId,
    productionEnvironmentId
  );

  if (blueprintTemplates.length === 0) {
    return await Promise.all([
      productionNotificationTemplateService.createTemplate({
        _id: popularTemplateIds[0],
        noFeedId: true,
        noLayoutId: true,
        name: ':fa-solid fa-star: Super cool workflow',
        isBlueprint: true,
      }),
    ]);
  }

  return blueprintTemplates;
}
