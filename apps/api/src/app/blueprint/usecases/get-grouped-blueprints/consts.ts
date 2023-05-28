/* eslint-disable max-len */
/* cSpell:disable */
import { INotificationTemplate, StepTypeEnum } from '@novu/shared';

const production = () => {
  const STEPS = [
    {
      _id: 'digest',
      name: 'Digest',
      template: {
        type: StepTypeEnum.DIGEST,
        content: '',
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
        content: 'adsf',
      },
    },
  ];

  const STEPS2 = [
    {
      _id: 'in-app',
      name: 'In-App',
      template: {
        type: StepTypeEnum.IN_APP,
        content: '',
      },
    },
    {
      _id: 'digest',
      name: 'Digest',
      template: {
        type: StepTypeEnum.DIGEST,
        content: '',
      },
    },
    {
      _id: 'email',
      name: 'Email',
      template: {
        name: 'Test email',
        type: StepTypeEnum.EMAIL,
        content: 'adsf',
      },
    },
    {
      _id: 'push',
      name: 'Push',
      template: {
        type: StepTypeEnum.PUSH,
        content: 'Test push',
      },
    },
  ];

  const POPULAR_TEMPLATES_GROUPED = {
    name: 'Popular',
    blueprints: [
      {
        _id: '1',
        name: ':fa-regular fa-message: Comments',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
        steps: STEPS,
        triggers: [
          {
            type: 'event',
            identifier: 'template_identifier_1',
          },
        ],
        isBlueprint: true,
      },
      {
        _id: '2',
        name: ':fa-solid fa-user-check: Mentions',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
        steps: STEPS2,
        triggers: [
          {
            type: 'event',
            identifier: 'template_identifier_2',
          },
        ],
        isBlueprint: true,
      },
      {
        _id: '3',
        name: ':fa-solid fa-reply: Reply',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
        steps: STEPS,
        triggers: [
          {
            type: 'event',
            identifier: 'template_identifier_3',
          },
        ],
        isBlueprint: true,
      },
    ] as INotificationTemplate[],
  };

  return { templates: POPULAR_TEMPLATES_GROUPED };
};

const development = () => {
  const STEPS = [
    {
      _id: 'digest',
      name: 'Digest',
      template: {
        type: StepTypeEnum.DIGEST,
        content: '',
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
        content: 'adsf',
      },
    },
  ];

  const STEPS2 = [
    {
      _id: 'in-app',
      name: 'In-App',
      template: {
        type: StepTypeEnum.IN_APP,
        content: '',
      },
    },
    {
      _id: 'digest',
      name: 'Digest',
      template: {
        type: StepTypeEnum.DIGEST,
        content: '',
      },
    },
    {
      _id: 'email',
      name: 'Email',
      template: {
        name: 'Test email',
        type: StepTypeEnum.EMAIL,
        content: 'adsf',
      },
    },
    {
      _id: 'push',
      name: 'Push',
      template: {
        type: StepTypeEnum.PUSH,
        content: 'Test push',
      },
    },
  ];

  const POPULAR_TEMPLATES_GROUPED = {
    name: 'Popular',
    blueprints: [
      {
        _id: '1',
        name: ':fa-regular fa-message: Comments',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
        steps: STEPS,
        isBlueprint: true,
      },
      {
        _id: '2',
        name: ':fa-solid fa-user-check: Mentions',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
        steps: STEPS2,
        isBlueprint: true,
      },
      {
        _id: '3',
        name: ':fa-solid fa-reply: Reply',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
        steps: STEPS,
        isBlueprint: true,
      },
    ] as INotificationTemplate[],
  };

  return { templates: POPULAR_TEMPLATES_GROUPED };
};

export const POPULAR_TEMPLATES_GROUPED =
  process.env.NODE_ENV === 'production' ? production().templates : development().templates;
