import { DalService, NotificationTemplateEntity } from '@novu/dal';
import { UserSession, NotificationTemplateService } from '@novu/testing';

export async function getSession(
  settings: {
    noEnvironment?: boolean;
    partialTemplate?: Partial<NotificationTemplateEntity>;
    noTemplates?: boolean;
    showOnBoardingTour?: boolean;
  } = {}
) {
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
