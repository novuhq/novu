import { faker } from '@faker-js/faker';
import { ChannelCTATypeEnum, EmailBlockTypeEnum, StepTypeEnum, TemplateVariableTypeEnum } from '@novu/shared';
import {
  MessageTemplateRepository,
  NotificationGroupRepository,
  NotificationStepEntity,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  FeedRepository,
  LayoutRepository,
} from '@novu/dal';
import { CreateTemplatePayload } from './create-notification-template.interface';

export class NotificationTemplateService {
  constructor(private userId: string, private organizationId: string, private environmentId: string) {}

  private notificationTemplateRepository = new NotificationTemplateRepository();
  private notificationGroupRepository = new NotificationGroupRepository();
  private messageTemplateRepository = new MessageTemplateRepository();
  private feedRepository = new FeedRepository();
  private layoutRepository = new LayoutRepository();

  async createTemplate(override: Partial<CreateTemplatePayload> = {}) {
    const groups = await this.notificationGroupRepository.find({
      _environmentId: this.environmentId,
    });
    const feeds = await this.feedRepository.find({
      _environmentId: this.environmentId,
    });
    const layouts = await this.layoutRepository.find({
      _environmentId: this.environmentId,
    });

    const steps: CreateTemplatePayload['steps'] = override?.steps ?? [
      {
        type: StepTypeEnum.IN_APP,
        content: 'Test content for <b>{{firstName}}</b>',
        cta: {
          type: ChannelCTATypeEnum.REDIRECT,
          data: {
            url: '/cypress/test-shell/example/test?test-param=true',
          },
        },
        variables: [
          {
            defaultValue: '',
            name: 'firstName',
            required: false,
            type: TemplateVariableTypeEnum.STRING,
          },
        ],
      },
      {
        type: StepTypeEnum.EMAIL,
        subject: 'Password reset',
        content: [
          {
            type: EmailBlockTypeEnum.TEXT,
            content: 'This are the text contents of the template for {{firstName}}',
          },
          {
            type: EmailBlockTypeEnum.BUTTON,
            content: 'SIGN UP',
            url: 'https://url-of-app.com/{{urlVariable}}',
          },
        ],
        variables: [
          {
            defaultValue: '',
            name: 'firstName',
            required: false,
            type: TemplateVariableTypeEnum.STRING,
          },
        ],
      },
    ];

    const templateSteps: NotificationStepEntity[] = [];

    for (const message of steps) {
      const saved = await this.messageTemplateRepository.create({
        type: message.type,
        cta: message.cta,
        variables: message.variables,
        content: message.content,
        subject: message.subject,
        title: message.title,
        name: message.name,
        actor: message.actor,
        _feedId: override.noFeedId ? undefined : feeds[0]._id,
        _layoutId: override.noLayoutId ? undefined : layouts[0]._id,
        _creatorId: this.userId,
        _organizationId: this.organizationId,
        _environmentId: this.environmentId,
      });

      if (saved?._id) {
        templateSteps.push({
          filters: message.filters,
          _templateId: saved._id,
          active: message.active,
          metadata: message.metadata as any,
          replyCallback: message.replyCallback,
          uuid: message.uuid,
        });
      }
    }

    const data = {
      _notificationGroupId: override.noGroupId ? undefined : groups[0]._id,
      _environmentId: this.environmentId,
      name: faker.name.jobTitle(),
      _organizationId: this.organizationId,
      _creatorId: this.userId,
      active: true,
      preferenceSettings: override.preferenceSettingsOverride ?? undefined,
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
      steps: templateSteps,
    } as NotificationTemplateEntity;

    const notificationTemplate = await this.notificationTemplateRepository.create(data);

    return await this.notificationTemplateRepository.findById(
      notificationTemplate._id,
      notificationTemplate._environmentId
    );
  }

  async getBlueprintTemplates(organizationId: string, environmentId: string): Promise<NotificationTemplateEntity[]> {
    const blueprintTemplates = await this.notificationTemplateRepository.findBlueprintTemplates(
      organizationId,
      environmentId
    );

    return blueprintTemplates;
  }
}
