import { faker } from '@faker-js/faker';
import { ChannelCTATypeEnum, ChannelTypeEnum } from '@notifire/shared';
import {
  MessageTemplateRepository,
  NotificationGroupRepository,
  NotificationMessagesEntity,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
} from '@notifire/dal';
import { CreateTemplatePayload } from './create-notification-template.interface';

export class NotificationTemplateService {
  constructor(private userId: string, private organizationId: string | undefined, private applicationId: string) {}

  private notificationTemplateRepository = new NotificationTemplateRepository();

  private notificationGroupRepository = new NotificationGroupRepository();

  private messageTemplateRepository = new MessageTemplateRepository();

  async createTemplate(override: Partial<CreateTemplatePayload> = {}) {
    const groups = await this.notificationGroupRepository.find({
      _applicationId: this.applicationId,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = override?.messages ?? [
      {
        type: ChannelTypeEnum.IN_APP,
        content: 'Test content for <b>{{firstName}}</b>',
        cta: {
          type: ChannelCTATypeEnum.REDIRECT,
          data: {
            url: '/cypress/test-shell/example/test?test-param=true',
          },
        },
      },
      {
        type: ChannelTypeEnum.EMAIL,
        subject: 'Password reset',
        content: [
          {
            type: 'text',
            content: 'This are the text contents of the template for {{firstName}}',
          },
          {
            type: 'button',
            content: 'SIGN UP',
            url: 'https://url-of-app.com/{{urlVariable}}',
          },
        ],
      },
    ];

    const templateMessages: NotificationMessagesEntity[] = [];

    for (const message of messages) {
      const saved = await this.messageTemplateRepository.create({
        type: message.type,
        cta: message.cta,
        content: message.content,
        subject: message.subject,
        name: message.name,
        _creatorId: this.userId,
        _organizationId: this.organizationId,
        _applicationId: this.applicationId,
      });

      templateMessages.push({
        filters: message.filters,
        _templateId: saved._id,
      });
    }

    const data: NotificationTemplateEntity = {
      _notificationGroupId: groups[0]._id,
      _applicationId: this.applicationId,
      name: faker.name.title(),
      _organizationId: this.organizationId,
      _creatorId: this.userId,
      active: true,
      draft: false,
      tags: ['test-tag'],
      description: faker.commerce.productDescription().slice(0, 90),
      triggers: [
        {
          identifier: `test-event-${faker.datatype.uuid()}`,
          type: 'event',
          variables: [{ name: 'firstName' }, { name: 'lastName' }, { name: 'urlVariable' }],
        },
      ],
      ...override,
      messages: templateMessages,
    };

    const notificationTemplate = await this.notificationTemplateRepository.create(data);

    return await this.notificationTemplateRepository.findById(
      notificationTemplate._id,
      notificationTemplate._organizationId
    );
  }
}
