/**
 * @type {Cypress.PluginConfig}
 */
const injectReactScriptsDevServer = require('@cypress/react/plugins/react-scripts');
import { DalService, NotificationTemplateEntity, UserRepository } from '@novu/dal';
import { UserSession, SubscribersService, NotificationTemplateService, NotificationsService } from '@novu/testing';

const userRepository = new UserRepository();
module.exports = (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config
  on('task', {
    async createNotifications({ identifier, token, count = 1, environmentId, organizationId }) {
      const subscriberService = new SubscribersService(organizationId, environmentId);
      const subscriber = await subscriberService.createSubscriber();

      const triggerIdentifier = identifier;
      const service = new NotificationsService(token);

      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < count; i++) {
        await service.triggerEvent(triggerIdentifier, subscriber.subscriberId, {});
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

      new UserSession('http://localhost:1336');

      return true;
    },
    async passwordResetToken(id: string) {
      const dal = new DalService();
      await dal.connect('mongodb://localhost:27017/novu-test');
      const user = await userRepository.findOne({
        _id: id,
      });
      return user?.resetToken;
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
        session.environment._id
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

  injectReactScriptsDevServer(on, config);
};
