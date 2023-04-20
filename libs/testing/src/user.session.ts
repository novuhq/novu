import 'cross-fetch/polyfill';
import { faker } from '@faker-js/faker';
import { SuperTest, Test } from 'supertest';
import * as request from 'supertest';
import * as defaults from 'superagent-defaults';
import { v4 as uuid } from 'uuid';
import { Novu, TriggerRecipientsPayload } from '@novu/node';
import { EmailBlockTypeEnum, IEmailBlock, StepTypeEnum } from '@novu/shared';
import {
  UserEntity,
  EnvironmentEntity,
  OrganizationEntity,
  NotificationGroupEntity,
  EnvironmentRepository,
  NotificationGroupRepository,
  FeedRepository,
  ChangeRepository,
  ChangeEntity,
  SubscriberRepository,
  LayoutRepository,
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

export class UserSession {
  private environmentRepository = new EnvironmentRepository();
  private notificationGroupRepository = new NotificationGroupRepository();
  private feedRepository = new FeedRepository();
  private layoutRepository = new LayoutRepository();
  private changeRepository: ChangeRepository = new ChangeRepository();
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

  serverSdk: Novu;

  constructor(public serverUrl = `http://localhost:${process.env.PORT}`) {
    this.jobsService = new JobsService();
  }

  async initialize(options: { noOrganization?: boolean; noEnvironment?: boolean; noIntegrations?: boolean } = {}) {
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
      password: '123Qwe!@#',
      showOnBoarding: true,
    };

    this.user = await userService.createUser(userEntity);

    if (!options.noOrganization) {
      await this.addOrganization();
    }

    await this.fetchJWT();

    if (!options.noOrganization) {
      if (!options?.noEnvironment) {
        const environment = await this.createEnvironment('Development');
        await this.createEnvironment('Production', this.environment._id);
        this.environment = environment;
        this.apiKey = this.environment.apiKeys[0].key;

        if (!options?.noIntegrations) {
          await this.createIntegration();
        }
        await this.createFeed();
        await this.createFeed('New');
      }
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

    this.serverSdk = new Novu(this.apiKey, {
      backendUrl: this.serverUrl,
    });
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

  async createEnvironment(name = 'Test environment', parentId: string | undefined = undefined) {
    this.environment = await this.environmentRepository.create({
      name,
      identifier: uuid(),
      _parentId: parentId,
      _organizationId: this.organization._id,
      apiKeys: [
        {
          key: uuid(),
          _userId: this.user._id,
        },
      ],
    });

    let parentGroup;
    if (parentId) {
      parentGroup = await this.notificationGroupRepository.findOne({
        _environmentId: parentId,
        _organizationId: this.organization._id,
      });
    }

    await this.notificationGroupRepository.create({
      name: 'General',
      _environmentId: this.environment._id,
      _organizationId: this.organization._id,
      _parentId: parentGroup?._id,
    });

    await this.layoutRepository.create({
      name: 'Default',
      _environmentId: this.environment._id,
      _organizationId: this.organization._id,
      isDefault: true,
    });

    return this.environment;
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

  async addEnvironment() {
    const environmentService = new EnvironmentService();

    this.environment = await environmentService.createEnvironment(this.organization._id);

    return this.environment;
  }

  async createTemplate(template?: Partial<CreateTemplatePayload>) {
    const service = new NotificationTemplateService(this.user._id, this.organization._id, this.environment._id);

    return await service.createTemplate(template);
  }

  async createIntegration() {
    const service = new IntegrationService();

    return await service.createIntegration(this.environment._id, this.organization._id);
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

  async switchEnvironment(environmentId: string) {
    const environmentService = new EnvironmentService();

    const environment = await environmentService.getEnvironment(environmentId);

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
    await this.testAgent.post('/v1/events/trigger').send({
      name: triggerName,
      to: to,
      payload,
    });
  }

  public async awaitParsingEvents() {
    await this.jobsService.awaitParsingEvents();
  }

  public async awaitRunningJobs(
    templateId?: string | string[],
    delay?: boolean,
    unfinishedJobs = 0,
    organizationId = this.organization._id
  ) {
    await this.jobsService.awaitRunningJobs({
      templateId,
      organizationId,
      delay,
      unfinishedJobs,
    });
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
}
