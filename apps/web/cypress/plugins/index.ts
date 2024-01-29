/**
 * @type {Cypress.PluginConfig}
 */
import { DalService, IntegrationRepository, NotificationGroupRepository, NotificationTemplateEntity } from '@novu/dal';
import {
  UserSession,
  SubscribersService,
  NotificationTemplateService,
  NotificationsService,
  OrganizationService,
  UserService,
  EnvironmentService,
} from '@novu/testing';
import { JobsService } from '@novu/testing';
import { ChannelTypeEnum, getPopularTemplateIds, ProvidersIdEnum } from '@novu/shared';

const jobsService = new JobsService();

module.exports = (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config
  on('task', {
    async createNotifications({
      identifier,
      token,
      count = 1,
      subscriberId,
      environmentId,
      organizationId,
      templateId,
    }) {
      let subId = subscriberId;
      if (!subId) {
        const subscribersService = new SubscribersService(organizationId, environmentId);
        const subscriber = await subscribersService.createSubscriber();
        subId = subscriber.subscriberId;
      }

      const triggerIdentifier = identifier;
      const service = new NotificationsService(token);
      const session = new UserSession(config.env.API_URL);

      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < count; i++) {
        await service.triggerEvent(triggerIdentifier, subId, {});
      }

      if (organizationId) {
        await session.awaitRunningJobs(templateId, undefined, 0, organizationId);
      }

      while (
        (await jobsService.standardQueue.getWaitingCount()) ||
        (await jobsService.standardQueue.getActiveCount())
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      return 'ok';
    },
    async clearDatabase() {
      const dal = new DalService();
      await dal.connect('mongodb://127.0.0.1:27017/novu-test');
      await dal.destroy();
      return true;
    },
    async seedDatabase() {
      const dal = new DalService();
      await dal.connect('mongodb://127.0.0.1:27017/novu-test');

      const userService = new UserService();
      await userService.createCypressTestUser();

      return true;
    },
    async passwordResetToken(id: string) {
      const dal = new DalService();
      await dal.connect('mongodb://127.0.0.1:27017/novu-test');

      const userService = new UserService();
      const user = await userService.getUser(id);

      return user?.resetToken;
    },
    async addOrganization(userId: string) {
      const dal = new DalService();
      await dal.connect('mongodb://127.0.0.1:27017/novu-test');
      const organizationService = new OrganizationService();

      const organization = await organizationService.createOrganization();
      await organizationService.addMember(organization._id as string, userId);

      return organization;
    },
    async deleteProvider(query: {
      providerId: ProvidersIdEnum;
      channel: ChannelTypeEnum;
      environmentId: string;
      organizationId: string;
    }) {
      const dal = new DalService();
      await dal.connect('mongodb://127.0.0.1:27017/novu-test');

      const repository = new IntegrationRepository();

      return await repository.deleteMany({
        channel: query.channel,
        providerId: query.providerId,
        _environmentId: query.environmentId,
        _organizationId: query.organizationId,
      });
    },
    async getSession(
      settings: {
        noEnvironment?: boolean;
        partialTemplate?: Partial<NotificationTemplateEntity>;
        noTemplates?: boolean;
        showOnBoardingTour?: boolean;
      } = {}
    ) {
      const dal = new DalService();
      await dal.connect('mongodb://127.0.0.1:27017/novu-test');

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
    async makeBlueprints() {
      const dal = new DalService();
      await dal.connect('mongodb://127.0.0.1:27017/novu-test');

      const userService = new UserService();
      const user = await userService.createUser();

      const notificationGroupRepository = new NotificationGroupRepository();
      const organizationService = new OrganizationService();
      const environmentService = new EnvironmentService();

      let organization = await organizationService.getOrganization(config.env.BLUEPRINT_CREATOR);

      if (!organization) {
        organization = await organizationService.createOrganization({ _id: config.env.BLUEPRINT_CREATOR });
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

      if (!productionGeneralGroup) {
        await notificationGroupRepository.create({
          name: 'General',
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
          productionNotificationTemplateService.createTemplate({
            _id: popularTemplateIds[1],
            noFeedId: true,
            noLayoutId: true,
            name: ':fa-solid fa-lock: Password reset',
            isBlueprint: true,
          }),
        ]);
      }

      return blueprintTemplates;
    },
  });
};
