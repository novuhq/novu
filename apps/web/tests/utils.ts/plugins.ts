import { DalService, IntegrationRepository, NotificationTemplateEntity } from '@novu/dal';
import { ChannelTypeEnum, ProvidersIdEnum } from '@novu/shared';
import {
  UserSession,
  NotificationTemplateService,
  SubscribersService,
  NotificationsService,
  JobsService,
} from '@novu/testing';

export interface ISessionOptions {
  noEnvironment?: boolean;
  partialTemplate?: Partial<NotificationTemplateEntity>;
  noTemplates?: boolean;
  showOnBoardingTour?: boolean;
}

export async function getSession(settings: ISessionOptions = {}) {
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
  const service = new NotificationsService(token);
  const session = new UserSession(process.env.API_URL);

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < count; i++) {
    await service.triggerEvent(triggerIdentifier, subId, {});
  }

  if (organizationId) {
    await session.awaitRunningJobs(templateId, undefined, 0, organizationId);
  }

  while ((await jobsService.standardQueue.getWaitingCount()) || (await jobsService.standardQueue.getActiveCount())) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return 'ok';
}
