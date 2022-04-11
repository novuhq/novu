import 'cross-fetch/polyfill';
import { faker } from '@faker-js/faker';
import { SuperTest, Test } from 'supertest';
import * as request from 'supertest';
import * as defaults from 'superagent-defaults';

import { ChannelTypeEnum } from '@novu/shared';
import { UserEntity, UserRepository, ApplicationEntity, OrganizationEntity, NotificationGroupEntity } from '@novu/dal';
import { NotificationTemplateService } from './notification-template.service';
import { testServer } from './test-server.service';

import { OrganizationService } from './organization.service';
import { ApplicationService } from './application.service';
import { CreateTemplatePayload } from './create-notification-template.interface';
import { IntegrationService } from './integration.service';

export class UserSession {
  private userRepository = new UserRepository();

  token: string;

  notificationGroups: NotificationGroupEntity[] = [];

  organization: OrganizationEntity;

  user: UserEntity;

  testAgent: SuperTest<Test>;

  application: ApplicationEntity;

  testServer = testServer;

  apiKey: string;

  constructor(public serverUrl = `http://localhost:${process.env.PORT}`) {}

  async initialize(options: { noOrganization?: boolean; noApplication?: boolean } = {}) {
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
      if (!options?.noApplication) {
        await this.createApplication();
        await this.createIntegration();
      }
    }

    await this.fetchJWT();

    if (!options.noOrganization) {
      if (!options?.noApplication) {
        await this.updateApplicationDetails();
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
      `/v1/auth/test/token/${this.user._id}?applicationId=${
        this.application ? this.application._id : ''
      }&organizationId=${this.organization ? this.organization._id : ''}`
    );

    this.token = `Bearer ${response.body.data}`;
    this.testAgent = defaults(request(this.requestEndpoint)).set('Authorization', this.token);
  }

  async createApplication() {
    const response = await this.testAgent.post('/v1/applications').send({
      name: 'Test application',
    });

    this.application = response.body.data;
    this.apiKey = this.application.apiKeys[0].key;

    return this.application;
  }

  async updateApplicationDetails() {
    await this.testAgent
      .put('/v1/applications/branding')
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

  async addApplication() {
    const applicationService = new ApplicationService();

    this.application = await applicationService.createApplication(this.organization._id);

    return this.application;
  }

  async enableApiTokenMode() {
    this.testAgent = defaults(request(this.requestEndpoint)).set('Authorization', `ApiKey ${this.apiKey}`);
  }

  async createTemplate(template?: Partial<CreateTemplatePayload>) {
    const service = new NotificationTemplateService(this.user._id, this.organization._id, this.application._id);

    return await service.createTemplate(template);
  }

  async createIntegration() {
    const service = new IntegrationService();

    return await service.createIntegration(this.application._id, this.organization._id);
  }

  async createChannelTemplate(channel: ChannelTypeEnum) {
    const service = new NotificationTemplateService(this.user._id, this.organization._id, this.application._id);

    return await service.createTemplate({
      steps: [
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

    return this.organization;
  }

  async triggerEvent(triggerName: string, payload = {}) {
    await this.testAgent.post('/v1/events/trigger').send({
      name: triggerName,
      payload,
    });
  }
}
