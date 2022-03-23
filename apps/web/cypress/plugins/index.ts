import { IntegrationService } from '@notifire/testing/src/integraion.service';

/**
 * @type {Cypress.PluginConfig}
 */
const injectReactScriptsDevServer = require('@cypress/react/plugins/react-scripts');
import { DalService, NotificationTemplateEntity, UserRepository } from '@notifire/dal';
import { UserSession, SubscribersService, NotificationTemplateService, NotificationsService } from '@notifire/testing';

const userRepository = new UserRepository();
module.exports = (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config
  on('task', {
    async createIntegration({ organizationId, applicationId }) {
      const service = new IntegrationService();
      await service.createIntegration(applicationId, organizationId);
      return 'ok';
    },
    async createNotifications({ identifier, token, count = 1, applicationId, organizationId }) {
      const subscriberService = new SubscribersService(organizationId, applicationId);
      const subscriber = await subscriberService.createSubscriber();

      const triggerIdentifier = identifier;
      const service = new NotificationsService(token);

      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < count; i++) {
        await service.triggerEvent(triggerIdentifier, {
          $user_id: subscriber.subscriberId,
          $email: 'george@novu.co',
        });
      }

      return 'ok';
    },
    async clearDatabase() {
      const dal = new DalService();
      await dal.connect('mongodb://localhost:27017/notifire-test');
      await dal.destroy();
      return true;
    },
    async seedDatabase() {
      const dal = new DalService();
      await dal.connect('mongodb://localhost:27017/notifire-test');

      const session = new UserSession('http://localhost:1336');

      return true;
    },
    async passwordResetToken(id: string) {
      const dal = new DalService();
      await dal.connect('mongodb://localhost:27017/notifire-test');
      const user = await userRepository.findOne({
        _id: id,
      });
      return user?.resetToken;
    },
    async getSession(
      settings: { noApplication?: boolean; partialTemplate?: Partial<NotificationTemplateEntity> } = {}
    ) {
      const dal = new DalService();
      await dal.connect('mongodb://localhost:27017/notifire-test');

      const session = new UserSession('http://localhost:1336');
      await session.initialize({
        noApplication: settings?.noApplication,
      });

      const notificationTemplateService = new NotificationTemplateService(
        session.user._id,
        session.organization._id,
        session.application._id
      );

      let templates;
      if (!settings?.noApplication) {
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
        application: session.application,
        templates,
      };
    },
  });

  injectReactScriptsDevServer(on, config);
};
