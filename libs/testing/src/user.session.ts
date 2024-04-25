import 'cross-fetch/polyfill';
import { faker } from '@faker-js/faker';
import { SuperTest, Test } from 'supertest';
import * as request from 'supertest';
import * as defaults from 'superagent-defaults';
import { v4 as uuid } from 'uuid';
import {
  ApiServiceLevelEnum,
  EmailBlockTypeEnum,
  IApiRateLimitMaximum,
  IEmailBlock,
  JobTopicNameEnum,
  StepTypeEnum,
  TriggerRecipientsPayload,
} from '@novu/shared';
import {
  UserEntity,
  EnvironmentEntity,
  OrganizationEntity,
  NotificationGroupEntity,
  NotificationGroupRepository,
  FeedRepository,
  ChangeRepository,
  ChangeEntity,
  SubscriberRepository,
  LayoutRepository,
  IntegrationRepository,
} from '@novu/dal';

import { NotificationTemplateService } from './notification-template.service';
import { TestServer, testServer } from './test-server.service';
import { OrganizationService } from './organization.service';
import { EnvironmentService } from './environment.service';
import { CreateTemplatePayload } from './create-notification-template.interface';
import { IntegrationService } from './integration.service';
import { UserService } from './user.service';
import { JobsService } from './jobs.service';

const EMAIL_BLOCK: IEmailBlock[] = [
  {
    type: EmailBlockTypeEnum.TEXT,
    content: 'Email Content',
  },
];

export const CYPRESS_USER_PASSWORD = '123Qwe!@#';

export class UserSession {
  private notificationGroupRepository = new NotificationGroupRepository();
  private feedRepository = new FeedRepository();
  private layoutRepository = new LayoutRepository();
  private integrationRepository = new IntegrationRepository();
  private changeRepository: ChangeRepository = new ChangeRepository();
  private environmentService: EnvironmentService = new EnvironmentService();
  private integrationService: IntegrationService = new IntegrationService();
  private jobsService: JobsService;

  token: string;

  subscriberToken: string;

  subscriberId: string;

  subscriberProfile: {
    _id: string;
  } | null = null;

  notificationGroups: NotificationGroupEntity[] = [];

  organization: OrganizationEntity;

  user: UserEntity;

  testAgent: SuperTest<Test>;

  environment: EnvironmentEntity;

  testServer: null | TestServer = testServer;

  apiKey: string;

  constructor(public serverUrl = `http://127.0.0.1:${process.env.PORT}`) {
    this.jobsService = new JobsService();
  }

  async initialize(
    options: {
      noOrganization?: boolean;
      noEnvironment?: boolean;
      showOnBoardingTour?: boolean;
    } = {}
  ) {
    const card = {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
    };

    const userService = new UserService();
    const userEntity: Partial<UserEntity> = {
      lastName: card.lastName,
      firstName: card.firstName,
      email: `${card.firstName}_${card.lastName}_${faker.datatype.uuid()}@gmail.com`.toLowerCase(),
      profilePicture: `https://randomuser.me/api/portraits/men/${Math.floor(Math.random() * 60) + 1}.jpg`,
      tokens: [],
      password: CYPRESS_USER_PASSWORD,
      showOnBoarding: true,
      showOnBoardingTour: options.showOnBoardingTour ? 0 : 2,
    };

    this.user = await userService.createUser(userEntity);

    if (!options.noOrganization) {
      await this.addOrganization();
    }

    await this.fetchJWT();

    if (!options.noOrganization && !options?.noEnvironment) {
      await this.createEnvironmentsAndFeeds();
    }

    await this.fetchJWT();

    if (!options.noOrganization) {
      if (!options?.noEnvironment) {
        await this.updateOrganizationDetails();
      }
    }

    if (!options.noOrganization && !options.noEnvironment) {
      const { token, profile } = await this.initializeWidgetSession();
      this.subscriberToken = token;
      this.subscriberProfile = profile;
    }
  }

  private async initializeWidgetSession() {
    this.subscriberId = SubscriberRepository.createObjectId();

    const { body } = await this.testAgent
      .post('/v1/widgets/session/initialize')
      .send({
        applicationIdentifier: this.environment.identifier,
        subscriberId: this.subscriberId,
        firstName: 'Widget User',
        lastName: 'Test',
        email: 'test@example.com',
      })
      .expect(201);

    const { token, profile } = body.data;

    return { token, profile };
  }

  private shouldUseTestServer() {
    return this.testServer && !this.serverUrl;
  }

  private get requestEndpoint() {
    return this.shouldUseTestServer() ? this.testServer?.getHttpServer() : this.serverUrl;
  }

  async fetchJWT() {
    const response = await request(this.requestEndpoint).get(
      `/v1/auth/test/token/${this.user._id}?environmentId=${
        this.environment ? this.environment._id : ''
      }&organizationId=${this.organization ? this.organization._id : ''}`
    );

    this.token = `Bearer ${response.body.data}`;
    this.testAgent = defaults(request(this.requestEndpoint)).set('Authorization', this.token);
  }

  async createEnvironmentsAndFeeds(): Promise<void> {
    const development = await this.createEnvironment('Development');
    this.environment = development;
    const production = await this.createEnvironment('Production', development._id);
    this.apiKey = this.environment.apiKeys[0].key;

    await this.createIntegrations([development, production]);

    await this.createFeed();
    await this.createFeed('New');
  }

  async createEnvironment(name = 'Test environment', parentId?: string): Promise<EnvironmentEntity> {
    const environment = await this.environmentService.createEnvironment(
      this.organization._id,
      this.user._id,
      name,
      parentId
    );

    let parentGroup;
    if (parentId) {
      parentGroup = await this.notificationGroupRepository.findOne({
        _environmentId: parentId,
        _organizationId: this.organization._id,
      });
    }

    await this.notificationGroupRepository.create({
      name: 'General',
      _environmentId: environment._id,
      _organizationId: this.organization._id,
      _parentId: parentGroup?._id,
    });

    await this.layoutRepository.create({
      name: 'Default',
      identifier: 'default-layout',
      _environmentId: environment._id,
      _organizationId: this.organization._id,
      isDefault: true,
    });

    return environment;
  }

  async updateOrganizationDetails() {
    await this.testAgent
      .put('/v1/organizations/branding')
      .send({
        color: '#2a9d8f',
        logo: 'https://web.novu.co/static/images/logo-light.png',
        fontColor: '#214e49',
        contentBackground: '#c2cbd2',
        fontFamily: 'Montserrat',
      })
      .expect(200);

    const groupsResponse = await this.testAgent.get('/v1/notification-groups');

    this.notificationGroups = groupsResponse.body.data;
  }

  async createTemplate(template?: Partial<CreateTemplatePayload>) {
    const service = new NotificationTemplateService(this.user._id, this.organization._id, this.environment._id);

    return await service.createTemplate(template);
  }

  async createIntegrations(environments: EnvironmentEntity[]): Promise<void> {
    for (const environment of environments) {
      await this.integrationService.createChannelIntegrations(environment._id, this.organization._id);
    }
  }

  async createChannelTemplate(channel: StepTypeEnum) {
    const service = new NotificationTemplateService(this.user._id, this.organization._id, this.environment._id);

    return await service.createTemplate({
      steps: [
        {
          type: channel,
          content: channel === StepTypeEnum.EMAIL ? EMAIL_BLOCK : 'Test notification content',
        },
      ],
    });
  }

  async addOrganization() {
    const organizationService = new OrganizationService();

    this.organization = await organizationService.createOrganization();
    await organizationService.addMember(this.organization._id, this.user._id);

    return this.organization;
  }

  async switchToProdEnvironment() {
    const prodEnvironment = await this.environmentService.getProductionEnvironment(this.organization._id);
    if (prodEnvironment) {
      await this.switchEnvironment(prodEnvironment._id);
    }
  }

  async switchToDevEnvironment() {
    const devEnvironment = await this.environmentService.getDevelopmentEnvironment(this.organization._id);
    if (devEnvironment) {
      await this.switchEnvironment(devEnvironment._id);
    }
  }

  async switchEnvironment(environmentId: string) {
    const environment = await this.environmentService.getEnvironment(environmentId);

    if (environment) {
      this.environment = environment;
      await this.testAgent.post(`/v1/auth/environments/${environmentId}/switch`);

      await this.fetchJWT();
    }
  }

  async createFeed(name?: string) {
    name = name ? name : 'Activities';
    const feed = await this.feedRepository.create({
      name,
      identifier: name,
      _environmentId: this.environment._id,
      _organizationId: this.organization._id,
    });

    return feed;
  }

  async triggerEvent(triggerName: string, to: TriggerRecipientsPayload, payload = {}) {
    return await this.testAgent.post('/v1/events/trigger').send({
      name: triggerName,
      to: to,
      payload,
    });
  }

  public async awaitRunningJobs(
    templateId?: string | string[],
    delay?: boolean,
    unfinishedJobs = 0,
    organizationId = this.organization._id
  ) {
    return await this.jobsService.awaitRunningJobs({
      templateId,
      organizationId,
      delay,
      unfinishedJobs,
    });
  }

  public async queueGet(jobTopicName: JobTopicNameEnum, getter: 'getDelayed') {
    return await this.jobsService.queueGet(jobTopicName, getter);
  }

  public async applyChanges(where: Partial<ChangeEntity> = {}) {
    const changes = await this.changeRepository.find(
      {
        _environmentId: this.environment._id,
        _organizationId: this.organization._id,
        _parentId: { $exists: false, $eq: null },
        ...where,
      },
      '',
      {
        sort: { createdAt: 1 },
      }
    );

    for (const change of changes) {
      await this.testAgent.post(`/v1/changes/${change._id}/apply`);
    }
  }

  public async updateOrganizationServiceLevel(serviceLevel: ApiServiceLevelEnum) {
    const organizationService = new OrganizationService();

    await organizationService.updateServiceLevel(this.organization._id, serviceLevel);
  }

  public async updateEnvironmentApiRateLimits(apiRateLimits: Partial<IApiRateLimitMaximum>) {
    await this.environmentService.updateApiRateLimits(this.environment._id, apiRateLimits);
  }
}
