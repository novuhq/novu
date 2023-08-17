import {
  INotificationTemplate,
  ICreateNotificationTemplateDto,
  DigestTypeEnum,
  INotificationTemplateStep,
  NotificationStepDto,
  DelayTypeEnum,
  DigestUnitEnum,
  IWorkflowStepMetadata,
  MonthlyTypeEnum,
} from '@novu/shared';
import { StepTypeEnum, ActorTypeEnum, ChannelCTATypeEnum } from '@novu/shared';
import { v4 as uuid4 } from 'uuid';

import type { IForm, IFormStep } from './formTypes';

const mapToEmailFormStep = (item: INotificationTemplateStep): IFormStep => ({
  ...item,
  ...(!item.replyCallback && {
    replyCallback: {
      active: false,
      url: '',
    },
  }),
  template: {
    ...item.template,
    type: item?.template?.type ?? StepTypeEnum.EMAIL,
    layoutId: item?.template?._layoutId ?? '',
    preheader: item?.template?.preheader ?? '',
    senderName: item?.template?.senderName ?? '',
    content: item?.template?.content ?? '',
    ...(item?.template?.contentType === 'customHtml' && {
      htmlContent: item?.template?.content as string,
      content: [],
    }),
  },
});

const mapToInAppFormStep = (item: INotificationTemplateStep): IFormStep => ({
  ...item,
  template: {
    ...item.template,
    type: item?.template?.type ?? StepTypeEnum.IN_APP,
    content: item?.template?.content ?? '',
    feedId: item?.template?._feedId ?? '',
    actor: item?.template?.actor?.type
      ? item?.template?.actor
      : {
          type: ActorTypeEnum.NONE,
          data: null,
        },
    enableAvatar: item?.template?.actor?.type && item?.template?.actor.type !== ActorTypeEnum.NONE ? true : false,
    cta: {
      data: item?.template?.cta?.data ?? { url: '' },
      type: ChannelCTATypeEnum.REDIRECT,
      action: item?.template?.cta?.action ?? '',
    },
  },
});

const mapToDigestFormStep = (item: INotificationTemplateStep): IFormStep => {
  const { metadata, template, ...rest } = item;
  if (!metadata) {
    return {
      ...rest,
      template: template as any,
    };
  }

  if (metadata.type === DigestTypeEnum.BACKOFF || metadata.type === DigestTypeEnum.REGULAR) {
    return {
      ...rest,
      template: template as any,
      digestMetadata: {
        type: metadata.type,
        digestKey: metadata.digestKey,
        regular: {
          amount: `${metadata.amount}`,
          unit: metadata.unit,
          backoff: metadata.backoff,
          backoffAmount: `${metadata.backoffAmount}`,
          backoffUnit: metadata.backoffUnit,
        },
      },
    };
  }

  if (metadata.type === DigestTypeEnum.TIMED) {
    return {
      ...rest,
      template: template as any,
      digestMetadata: {
        type: metadata.type,
        digestKey: metadata.digestKey,
        timed: {
          unit: metadata.unit,
          ...(metadata.unit === DigestUnitEnum.MINUTES && { minutes: { amount: `${metadata.amount}` } }),
          ...(metadata.unit === DigestUnitEnum.HOURS && { hours: { amount: `${metadata.amount}` } }),
          ...(metadata.unit === DigestUnitEnum.DAYS && {
            days: { amount: `${metadata.amount}`, atTime: metadata.timed?.atTime ?? '' },
          }),
          ...(metadata.unit === DigestUnitEnum.WEEKS && {
            weeks: {
              amount: `${metadata.amount}`,
              atTime: metadata.timed?.atTime ?? '',
              weekDays: metadata.timed?.weekDays ?? [],
            },
          }),
          ...(metadata.unit === DigestUnitEnum.MONTHS && {
            months: {
              amount: `${metadata.amount}`,
              atTime: metadata.timed?.atTime ?? '',
              monthDays: metadata.timed?.monthDays ?? [],
              monthlyType: metadata.timed?.monthlyType ?? MonthlyTypeEnum.EACH,
              ordinal: metadata.timed?.ordinal,
              ordinalValue: metadata.timed?.ordinalValue,
            },
          }),
        },
      },
    };
  }

  return {
    ...rest,
    template: template as any,
  };
};

const mapToDelayFormStep = (item: INotificationTemplateStep): IFormStep => {
  const { metadata, template, ...rest } = item;
  if (!metadata) {
    return {
      ...rest,
      template: template as any,
    };
  }

  if (metadata.type === DelayTypeEnum.REGULAR) {
    return {
      ...rest,
      template: template as any,
      delayMetadata: {
        type: metadata.type,
        regular: {
          amount: `${metadata.amount}`,
          unit: metadata.unit,
        },
      },
    };
  }

  if (metadata.type === DelayTypeEnum.SCHEDULED) {
    return {
      ...rest,
      template: template as any,
      delayMetadata: {
        type: metadata.type,
        scheduled: {
          delayPath: metadata.delayPath,
        },
      },
    };
  }

  return {
    ...rest,
    template: template as any,
  };
};

export const mapNotificationTemplateToForm = (template: INotificationTemplate): IForm => {
  const form: IForm = {
    notificationGroupId: template._notificationGroupId,
    name: template.name,
    description: template.description ?? '',
    tags: template.tags,
    identifier: template.triggers[0].identifier,
    critical: !template.critical,
    preferenceSettings: template.preferenceSettings,
    steps: [],
  };

  form.steps = template.steps.map((item) => {
    if (!item.uuid) {
      item.uuid = uuid4();
    }

    if (item?.template?.type === StepTypeEnum.EMAIL) {
      return mapToEmailFormStep(item);
    }
    if (item?.template?.type === StepTypeEnum.IN_APP) {
      return mapToInAppFormStep(item);
    }
    if (item?.template?.type === StepTypeEnum.DIGEST) {
      return mapToDigestFormStep(item);
    }
    if (item?.template?.type === StepTypeEnum.DELAY) {
      return mapToDelayFormStep(item);
    }

    return item as IFormStep;
  });

  return form;
};

export const mapFormToCreateNotificationTemplate = (form: IForm): ICreateNotificationTemplateDto => {
  const steps = form.steps.map((formStep: IFormStep) => {
    const { digestMetadata, delayMetadata, template, ...rest } = formStep;
    const step: NotificationStepDto = { ...rest };

    if (template.type === StepTypeEnum.EMAIL && template.contentType === 'customHtml') {
      template.content = template.htmlContent as string;
    }

    if (template.type === StepTypeEnum.IN_APP) {
      if (!template.enableAvatar) {
        template.actor = {
          type: ActorTypeEnum.NONE,
          data: null,
        };
      }

      delete template.enableAvatar;
    }

    if (template.type === StepTypeEnum.DIGEST) {
      return {
        ...step,
        template,
        metadata: mapFormStepDigestMetadata(formStep),
      };
    }

    if (template.type === StepTypeEnum.DELAY) {
      return {
        ...step,
        template,
        metadata: mapFormStepDelayMetadata(formStep),
      };
    }

    return {
      ...step,
      template,
    };
  });

  return {
    name: form.name,
    notificationGroupId: form.notificationGroupId,
    description: form.description !== '' ? form.description : undefined,
    tags: form.tags,
    critical: !form.critical,
    preferenceSettings: form.preferenceSettings,
    steps,
  };
};

const mapFormStepDelayMetadata = (formStep: IFormStep): IWorkflowStepMetadata | undefined => {
  if (!formStep.delayMetadata) {
    return undefined;
  }

  if (formStep.delayMetadata.type === DelayTypeEnum.REGULAR && formStep.delayMetadata.regular) {
    return {
      type: formStep.delayMetadata.type,
      ...formStep.delayMetadata.regular,
      amount: parseInt(formStep.delayMetadata.regular.amount, 10),
    };
  }
  if (formStep.delayMetadata.type === DelayTypeEnum.SCHEDULED && formStep.delayMetadata.scheduled) {
    return {
      type: formStep.delayMetadata.type,
      ...formStep.delayMetadata.scheduled,
    };
  }

  return undefined;
};

const mapFormStepDigestMetadata = (formStep: IFormStep): IWorkflowStepMetadata | undefined => {
  if (!formStep.digestMetadata) {
    return undefined;
  }

  if (formStep.digestMetadata?.digestKey === '') {
    delete formStep.digestMetadata.digestKey;
  }

  if (formStep.digestMetadata.type === DigestTypeEnum.REGULAR && formStep.digestMetadata.regular) {
    return {
      type: formStep.digestMetadata.type,
      digestKey: formStep.digestMetadata.digestKey,
      ...formStep.digestMetadata.regular,
      amount: parseInt(formStep.digestMetadata.regular.amount, 10),
      backoffAmount: formStep.digestMetadata.regular.backoffAmount
        ? parseInt(formStep.digestMetadata.regular.backoffAmount, 10)
        : undefined,
    };
  }

  if (formStep.digestMetadata.type === DigestTypeEnum.TIMED && formStep.digestMetadata.timed) {
    if (formStep.digestMetadata.timed.unit === DigestUnitEnum.MINUTES && formStep.digestMetadata.timed.minutes) {
      return {
        type: formStep.digestMetadata.type,
        digestKey: formStep.digestMetadata.digestKey,
        unit: formStep.digestMetadata.timed.unit,
        amount: parseInt(formStep.digestMetadata.timed.minutes.amount, 10),
      };
    }
    if (formStep.digestMetadata.timed.unit === DigestUnitEnum.HOURS && formStep.digestMetadata.timed.hours) {
      return {
        type: formStep.digestMetadata.type,
        digestKey: formStep.digestMetadata.digestKey,
        unit: formStep.digestMetadata.timed.unit,
        amount: parseInt(formStep.digestMetadata.timed.hours.amount, 10),
      };
    }
    if (formStep.digestMetadata.timed.unit === DigestUnitEnum.DAYS && formStep.digestMetadata.timed.days) {
      return {
        type: formStep.digestMetadata.type,
        digestKey: formStep.digestMetadata.digestKey,
        unit: formStep.digestMetadata.timed.unit,
        amount: parseInt(formStep.digestMetadata.timed.days.amount, 10),
        timed: {
          atTime: formStep.digestMetadata.timed.days.atTime,
        },
      };
    }
    if (formStep.digestMetadata.timed.unit === DigestUnitEnum.WEEKS && formStep.digestMetadata.timed.weeks) {
      return {
        type: formStep.digestMetadata.type,
        digestKey: formStep.digestMetadata.digestKey,
        unit: formStep.digestMetadata.timed.unit,
        amount: parseInt(formStep.digestMetadata.timed.weeks.amount, 10),
        timed: {
          atTime: formStep.digestMetadata.timed.weeks.atTime,
          weekDays: formStep.digestMetadata.timed.weeks.weekDays,
        },
      };
    }
    if (formStep.digestMetadata.timed.unit === DigestUnitEnum.MONTHS && formStep.digestMetadata.timed.months) {
      return {
        type: formStep.digestMetadata.type,
        unit: formStep.digestMetadata.timed.unit,
        amount: parseInt(formStep.digestMetadata.timed.months.amount, 10),
        timed: {
          atTime: formStep.digestMetadata.timed.months.atTime,
          monthDays: formStep.digestMetadata.timed.months.monthDays,
          monthlyType: formStep.digestMetadata.timed.months.monthlyType,
          ordinal: formStep.digestMetadata.timed.months.ordinal,
          ordinalValue: formStep.digestMetadata.timed.months.ordinalValue,
        },
      };
    }
  }

  return undefined;
};
