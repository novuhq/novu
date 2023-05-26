/* eslint-disable max-len */
/* cSpell:disable */
import {
  DigestTypeEnum,
  DigestUnitEnum,
  INotificationTemplate,
  INotificationTemplateStep,
  StepTypeEnum,
} from '@novu/shared';

const STEPS: INotificationTemplateStep[] = [
  {
    _id: 'digest',
    name: 'Digest',
    template: {
      type: StepTypeEnum.DIGEST,
      content: '',
    },
    metadata: {
      type: DigestTypeEnum.REGULAR,
      amount: 5,
      unit: DigestUnitEnum.MINUTES,
    },
  },
  {
    _id: 'email',
    name: 'Email',
    template: {
      name: 'Test email',
      subject: 'Test subject',
      title: 'Test title',
      type: StepTypeEnum.EMAIL,
      content: 'Test content',
    },
  },
];

const STEPS2: INotificationTemplateStep[] = [
  {
    _id: 'in-app',
    name: 'In-App',
    template: {
      type: StepTypeEnum.IN_APP,
      content: 'Test content',
    },
  },
  {
    _id: 'digest',
    name: 'Digest',
    template: {
      type: StepTypeEnum.DIGEST,
      content: '',
    },
    metadata: {
      type: DigestTypeEnum.REGULAR,
      amount: 5,
      unit: DigestUnitEnum.MINUTES,
    },
  },
  {
    _id: 'email',
    name: 'Email',
    template: {
      name: 'Test email',
      subject: 'Test subject',
      title: 'Test title',
      type: StepTypeEnum.EMAIL,
      content: 'Test content',
    },
  },
  {
    _id: 'push',
    name: 'Push',
    template: {
      type: StepTypeEnum.PUSH,
      content: 'Test content',
    },
  },
];

export const POPULAR_TEMPLATES_GROUPED = {
  name: 'Popular',
  blueprints: [
    {
      _id: '1',
      name: ':fa-regular fa-message: Comments',
      description: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae.',
      steps: STEPS,
      triggers: [
        {
          type: 'event',
          identifier: 'template_identifier_1',
        },
      ],
      isBlueprint: true,
      active: true,
      draft: false,
      critical: false,
      preferenceSettings: {
        chat: true,
        email: true,
        in_app: true,
        push: true,
        sms: true,
      },
    },
    {
      _id: '2',
      name: ':fa-solid fa-user-check: Mentions',
      description: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae.',
      steps: STEPS2,
      triggers: [
        {
          type: 'event',
          identifier: 'template_identifier_2',
        },
      ],
      isBlueprint: true,
      active: true,
      draft: false,
      critical: false,
      preferenceSettings: {
        chat: true,
        email: true,
        in_app: true,
        push: true,
        sms: true,
      },
    },
    {
      _id: '3',
      name: ':fa-solid fa-reply: Reply',
      description: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae.',
      steps: STEPS,
      triggers: [
        {
          type: 'event',
          identifier: 'template_identifier_3',
        },
      ],
      isBlueprint: true,
      active: true,
      draft: false,
      critical: false,
      preferenceSettings: {
        chat: true,
        email: true,
        in_app: true,
        push: true,
        sms: true,
      },
    },
  ] as INotificationTemplate[],
};
