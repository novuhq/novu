/**
 * @type {Cypress.PluginConfig}
 */
import { DalService, NotificationTemplateEntity } from '@novu/dal';
import {
  UserSession,
  SubscribersService,
  NotificationTemplateService,
  NotificationsService,
  OrganizationService,
  UserService,
} from '@novu/testing';

module.exports = (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config
  on('task', {
    async createNotifications({ identifier, token, count = 1, subscriberId, environmentId, organizationId }) {
      let subId = subscriberId;
      if (!subId) {
        const subscribersService = new SubscribersService(organizationId, environmentId);
        const subscriber = await subscribersService.createSubscriber();
        subId = subscriber.subscriberId;
      }

      const triggerIdentifier = identifier;
      const service = new NotificationsService(token);

      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < count; i++) {
        await service.triggerEvent(triggerIdentifier, subId, {});
      }

      return 'ok';
    },
    async clearDatabase() {
      const dal = new DalService();
      await dal.connect('mongodb://localhost:27017/novu-test');
      await dal.destroy();
      return true;
    },
    async seedDatabase() {
      const dal = new DalService();
      await dal.connect('mongodb://localhost:27017/novu-test');

      const userService = new UserService();
      await userService.createTestUser();

      return true;
    },
    async passwordResetToken(id: string) {
      const dal = new DalService();
      await dal.connect('mongodb://localhost:27017/novu-test');

      const userService = new UserService();
      const user = await userService.getUser(id);

      return user?.resetToken;
    },
    async addOrganization(userId: string) {
      const dal = new DalService();
      await dal.connect('mongodb://localhost:27017/novu-test');
      const organizationService = new OrganizationService();

      const organization = await organizationService.createOrganization();
      await organizationService.addMember(organization._id as string, userId);

      return organization;
    },
    async getSession(
      settings: { noEnvironment?: boolean; partialTemplate?: Partial<NotificationTemplateEntity> } = {}
    ) {
      const dal = new DalService();
      await dal.connect('mongodb://localhost:27017/novu-test');

      const session = new UserSession('http://localhost:1336');
      await session.initialize({
        noEnvironment: settings?.noEnvironment,
      });

      const notificationTemplateService = new NotificationTemplateService(
        session.user._id,
        session.organization._id,
        session.environment._id as string
      );

      let templates;
      if (!settings?.noEnvironment) {
        let templatePartial = settings?.partialTemplate || {};

        templates = await Promise.all([
          notificationTemplateService.createTemplate({ ...templatePartial }),
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
    },
  });
};
