import 'cross-fetch/polyfill';
import { faker } from '@faker-js/faker';
import { SuperTest, Test } from 'supertest';
import * as request from 'supertest';
import * as defaults from 'superagent-defaults';
import { v4 as uuid } from 'uuid';

import { ChannelTypeEnum } from '@novu/shared';
import {
  UserEntity,
  UserRepository,
  EnvironmentEntity,
  OrganizationEntity,
  NotificationGroupEntity,
  EnvironmentRepository,
} from '@novu/dal';
import { NotificationTemplateService } from './notification-template.service';
import { testServer } from './test-server.service';

import { OrganizationService } from './organization.service';
import { EnvironmentService } from './environment.service';
import { CreateTemplatePayload } from './create-notification-template.interface';
import { IntegrationService } from './integration.service';

export class UserSession {
  private userRepository = new UserRepository();
  private environmentRepository = new EnvironmentRepository();

  token: string;

  notificationGroups: NotificationGroupEntity[] = [];

  organization: OrganizationEntity;

  user: UserEntity;

  testAgent: SuperTest<Test>;

  environment: EnvironmentEntity;

  testServer = testServer;

  constructor(public serverUrl = `http://localhost:${process.env.PORT}`) {}

  async initialize(options: { noOrganization?: boolean; noEnvironment?: boolean } = {}) {
    const card = {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
    };

    this.user = await this.userRepository.create({
      lastName: card.lastName,
      firstName: card.firstName,
      email: `${card.firstName}_${card.lastName}_${faker.datatype.uuid()}@gmail.com`.toLowerCase(),
      profilePicture: `https://randomuser.me/api/portraits/men/${Math.floor(Math.random() * 60) + 1}.jpg`,
      tokens: [],
    });

    if (!options.noOrganization) {
      await this.addOrganization();
    }

    await this.fetchJWT();

    if (!options.noOrganization) {
      if (!options?.noEnvironment) {
        await this.createEnvironment('Development');
        await this.createEnvironment('Production', this.environment._parentId);

        await this.createIntegration();
      }
    }

    await this.fetchJWT();

    if (!options.noOrganization) {
      if (!options?.noEnvironment) {
        await this.updateEnvironmentDetails();
      }
    }
  }

  private shouldUseTestServer() {
    return this.testServer && !this.serverUrl;
  }

  private get requestEndpoint() {
    return this.shouldUseTestServer() ? this.testServer.getHttpServer() : this.serverUrl;
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

  async createEnvironment(name = 'Test environment', parentId: string = undefined) {
    this.environment = await this.environmentRepository.create({
      name,
      identifier: uuid(),
      _parentId: parentId,
    });

    return this.environment;
  }

  async updateEnvironmentDetails() {
    await this.testAgent
      .put('/v1/environments/branding')
      .send({
        color: '#2a9d8f',
        logo: 'https://novu.co/img/logo.png',
        fontColor: '#214e49',
        contentBackground: '#c2cbd2',
        fontFamily: 'Montserrat',
      })
      .expect(200);

    await this.testAgent
      .put('/v1/channels/sms/settings')
      .send({
        twillio: {
          authToken: '123456',
          phoneNumber: '45678',
          accountSid: '123123',
        },
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

  async createChannelTemplate(channel: ChannelTypeEnum) {
    const service = new NotificationTemplateService(this.user._id, this.organization._id, this.environment._id);

    return await service.createTemplate({
      messages: [
        {
          type: channel,
          content:
            channel === ChannelTypeEnum.EMAIL
              ? [
                  {
                    type: 'text',
                    content: 'Email Content',
                  },
                ]
              : 'Test notification content',
        },
      ],
    });
  }

  async addOrganization() {
    const organizationService = new OrganizationService();

    this.organization = await organizationService.createOrganization();
    await organizationService.addMember(this.organization._id, this.user._id);

    if (!this.environment) {
      await this.createEnvironment();
    }

    return this.organization;
  }

  async triggerEvent(triggerName: string, payload = {}) {
    await this.testAgent.post('/v1/events/trigger').send({
      name: triggerName,
      payload,
    });
  }
}
