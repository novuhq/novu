/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  EmailBlockTypeEnum,
  FieldLogicalOperatorEnum,
  FieldOperatorEnum,
  StepTypeEnum,
} from '@novu/shared';
import { MessageTemplateEntity } from '@novu/dal';

import { ConditionsFilter } from '../conditions-filter';
import { SelectVariant } from './select-variant.usecase';
import { MessageTemplateRepository } from '@novu/dal';
import { SelectVariantCommand } from './select-variant.command';

const findOneMessageTemplateMock = jest.fn(() => testVariant);

jest.mock('@novu/dal', () => ({
  ...jest.requireActual('@novu/dal'),
  MessageTemplateRepository: jest.fn(() => ({
    findOne: findOneMessageTemplateMock,
  })),
}));

describe('select variant', function () {
  let selectVariantUsecase: SelectVariant;

  beforeEach(async function () {
    selectVariantUsecase = new SelectVariant(
      // @ts-ignore
      new ConditionsFilter(),
      new MessageTemplateRepository()
      // @ts-ignore
    );
    jest.clearAllMocks();
  });

  it('should select the variant', async function () {
    const variant = await selectVariantUsecase.execute(
      command as unknown as SelectVariantCommand
    );

    expect(variant.messageTemplate.content).toEqual(testVariant.content);
    expect(variant.messageTemplate.subject).toEqual(testVariant.subject);
    expect(variant.messageTemplate._id).toEqual(testVariant._id);
  });

  it('should return step template if no variants are available', async function () {
    const commandWithoutVariants = { ...command };
    commandWithoutVariants.step.variants = [];

    const stepVariant = await selectVariantUsecase.execute(
      commandWithoutVariants as unknown as SelectVariantCommand
    );

    expect(stepVariant.conditions).toBeUndefined();
    expect(stepVariant.messageTemplate.content).toEqual(
      commandWithoutVariants.step.template.content
    );
    expect(stepVariant.messageTemplate.subject).toEqual(
      commandWithoutVariants.step.template.subject
    );
    expect(stepVariant.messageTemplate._id).toEqual(
      commandWithoutVariants.step.template._id
    );
  });

  it('should return step template if no filterData are available', async function () {
    const commandWithoutFilterData = { ...command };
    commandWithoutFilterData.filterData = {} as any;

    const stepVariant = await selectVariantUsecase.execute(
      commandWithoutFilterData as unknown as SelectVariantCommand
    );

    expect(stepVariant.conditions).toBeUndefined();
    expect(stepVariant.messageTemplate.content).toEqual(
      commandWithoutFilterData.step.template.content
    );
    expect(stepVariant.messageTemplate.subject).toEqual(
      commandWithoutFilterData.step.template.subject
    );
    expect(stepVariant.messageTemplate._id).toEqual(
      commandWithoutFilterData.step.template._id
    );
  });

  it('should return step template if no filters are available', async function () {
    const commandWithoutFilterData = { ...command };
    commandWithoutFilterData.filterData = {} as any;

    commandWithoutFilterData.step.variants.map((variant) => {
      variant.filters = [];
    });

    const stepVariant = await selectVariantUsecase.execute(
      commandWithoutFilterData as unknown as SelectVariantCommand
    );

    expect(stepVariant.conditions).toBeUndefined();
    expect(stepVariant.messageTemplate.content).toEqual(
      commandWithoutFilterData.step.template.content
    );
    expect(stepVariant.messageTemplate.subject).toEqual(
      commandWithoutFilterData.step.template.subject
    );
    expect(stepVariant.messageTemplate._id).toEqual(
      commandWithoutFilterData.step.template._id
    );
  });
});

const variantCommand = [
  {
    metadata: {
      timed: {
        weekDays: [],
        monthDays: [],
      },
    },
    active: true,
    shouldStopOnFail: false,
    filters: [
      {
        isNegated: false,
        type: 'GROUP',
        value: FieldLogicalOperatorEnum.AND,
        children: [
          {
            field: 'name',
            value: 'Titans',
            operator: FieldOperatorEnum.EQUAL,
            on: 'tenant',
            _id: '6509997c2c2343366ae4a864',
          },
        ],
        _id: '6509997c2c2343366ae4a863',
      },
    ],
    _templateId: '6509997c2c2343366ae4a858',
    _id: '6509997c2c2343366ae4a862',
    id: '6509997c2c2343366ae4a862',
  },
  {
    metadata: {
      timed: {
        weekDays: [],
        monthDays: [],
      },
    },
    active: true,
    shouldStopOnFail: false,
    filters: [
      {
        isNegated: false,
        type: 'GROUP',
        value: FieldLogicalOperatorEnum.AND,
        children: [
          {
            field: 'name',
            value: 'The one and only tenant',
            operator: FieldOperatorEnum.EQUAL,
            on: 'tenant',
            _id: '6509997c2c2343366ae4a867',
          },
        ],
        _id: '6509997c2c2343366ae4a866',
      },
    ],
    _templateId: '6509997c2c2343366ae4a85a',
    _id: '6509997c2c2343366ae4a865',
    id: '6509997c2c2343366ae4a865',
  },
];

const filterDataCommand = {
  tenant: {
    _id: '6509997c2c2343366ae4a851',
    identifier: 'one_123',
    name: 'The one and only tenant',
    data: {
      value1: 'Best fighter',
      value2: 'Ever',
    },
    _environmentId: '6509997c2c2343366ae4a7f1',
    _organizationId: '6509997c2c2343366ae4a7eb',
    createdAt: '2023-09-19T12:52:12.829Z',
    updatedAt: '2023-09-19T12:52:12.829Z',
    __v: 0,
    id: '6509997c2c2343366ae4a851',
  },
};

const stepCommand = {
  metadata: {
    timed: {
      weekDays: [],
      monthDays: [],
    },
  },
  active: true,
  shouldStopOnFail: false,
  filters: [],
  _templateId: '6509997c2c2343366ae4a856',
  variants: variantCommand,
  _id: '6509997c2c2343366ae4a861',
  id: '6509997c2c2343366ae4a861',
  template: {
    _id: '6509997c2c2343366ae4a856',
    type: 'email',
    active: true,
    name: 'Root Message Name',
    subject: 'Root Test email subject',
    variables: [],
    content: [
      {
        type: 'text',
        content: 'Root This is a sample text block',
      },
    ],
    preheader: 'Root Test email preheader',
    _environmentId: '6509997c2c2343366ae4a7f1',
    _organizationId: '6509997c2c2343366ae4a7eb',
    _creatorId: '6509997c2c2343366ae4a7e9',
    _feedId: '6509997c2c2343366ae4a820',
    _layoutId: '6509997c2c2343366ae4a7f6',
    deleted: false,
    createdAt: '2023-09-19T12:52:12.842Z',
    updatedAt: '2023-09-19T12:52:12.842Z',
    __v: 0,
    id: '6509997c2c2343366ae4a856',
  },
};

const command = {
  organizationId: '6509997c2c2343366ae4a7eb',
  environmentId: '6509997c2c2343366ae4a7f1',
  userId: '6509997c2c2343366ae4a7e9',
  step: stepCommand,
  filterData: filterDataCommand,
};

const testVariant: MessageTemplateEntity = {
  _id: '6509a934462a5dd6a03954fe',
  type: StepTypeEnum.EMAIL,
  active: true,
  name: 'Better Variant Message Template',
  subject: 'Better Variant subject',
  variables: [],
  content: [
    {
      type: EmailBlockTypeEnum.TEXT,
      content: 'This is a sample of Better Variant text block',
    },
  ],
  preheader: 'Better Variant pre header',
  _environmentId: '6509a934462a5dd6a0395495',
  _organizationId: '6509a934462a5dd6a039548f',
  _creatorId: '6509a934462a5dd6a039548d',
  _feedId: '6509a934462a5dd6a03954c4',
  _layoutId: '6509a934462a5dd6a039549a',
  deleted: false,
};
