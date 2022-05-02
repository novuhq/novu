/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

import { DalService } from '@novu/dal';
import { UserSession, NotificationTemplateService, NotificationsService } from '@novu/testing';

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on, config) => {
  on('before:browser:launch', (browser: any = {}, launchOptions) => {
    if (browser.name === 'chrome') {
      launchOptions.args.push('--disable-site-isolation-trials');
    }

    return launchOptions;
  });

  on('task', {
    async createNotifications({ identifier, token, subscriberId, count = 1 }) {
      const triggerIdentifier = identifier;
      const service = new NotificationsService(token);

      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < count; i++) {
        await service.triggerEvent(triggerIdentifier, subscriberId, {
          firstName: 'John',
        });
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

      const session = new UserSession('http://localhost:1336');

      return true;
    },
    async getSession(settings: { noEnvironment?: boolean } = {}) {
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
        templates = await Promise.all([
          notificationTemplateService.createTemplate(),
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
        identifier: session.environment.identifier,
        templates,
        session,
      };
    },
  });
};
