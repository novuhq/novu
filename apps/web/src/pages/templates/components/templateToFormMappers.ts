import type { INotificationTemplate, ICreateNotificationTemplateDto } from '@novu/shared';
import { StepTypeEnum, ActorTypeEnum, ChannelCTATypeEnum } from '@novu/shared';
import { v4 as uuid4 } from 'uuid';

import type { IForm, IStepEntity } from './formTypes';

const mapEmailStep = (item: IStepEntity): IStepEntity => ({
  ...item,
  ...(!item.replyCallback && {
    replyCallback: {
      active: false,
      url: '',
    },
  }),
  template: {
    ...item.template,
    layoutId: item.template._layoutId ?? '',
    preheader: item.template.preheader ?? '',
    senderName: item.template.senderName ?? '',
    content: item.template.content,
    ...(item.template?.contentType === 'customHtml' && {
      htmlContent: item.template.content as string,
      content: [],
    }),
  },
});

const mapInAppStep = (item: IStepEntity): IStepEntity => ({
  ...item,
  template: {
    ...item.template,
    feedId: item.template._feedId ?? '',
    actor: item.template.actor?.type
      ? item.template.actor
      : {
          type: ActorTypeEnum.NONE,
          data: null,
        },
    enableAvatar: item.template.actor?.type && item.template.actor.type !== ActorTypeEnum.NONE ? true : false,
    cta: {
      data: item.template.cta?.data ?? { url: '' },
      type: ChannelCTATypeEnum.REDIRECT,
      action: item.template.cta?.action ?? '',
    },
  },
});

export const mapNotificationTemplateToForm = (template: INotificationTemplate): IForm => {
  const form: IForm = {
    notificationGroupId: template._notificationGroupId,
    name: template.name,
    description: template.description ?? '',
    tags: template.tags,
    identifier: template.triggers[0].identifier,
    critical: template.critical,
    preferenceSettings: template.preferenceSettings,
    steps: [],
  };

  form.steps = (template.steps as IStepEntity[]).map((item) => {
    if (!item.uuid) {
      item.uuid = uuid4();
    }

    if (item.template.type === StepTypeEnum.EMAIL) {
      return mapEmailStep(item);
    }
    if (item.template.type === StepTypeEnum.IN_APP) {
      return mapInAppStep(item);
    }

    return item;
  });

  return form;
};

export const mapFormToCreateNotificationTemplate = (form: IForm): ICreateNotificationTemplateDto => {
  let stepsToSave = form.steps;

  stepsToSave = stepsToSave.map((step: IStepEntity) => {
    if (step.template.type === StepTypeEnum.EMAIL && step.template.contentType === 'customHtml') {
      step.template.content = step.template.htmlContent as string;
    }

    if (step.template.type === StepTypeEnum.IN_APP) {
      if (!step.template.enableAvatar) {
        step.template.actor = {
          type: ActorTypeEnum.NONE,
          data: null,
        };
      }

      delete step.template.enableAvatar;
    }

    return step;
  });

  return {
    name: form.name,
    notificationGroupId: form.notificationGroupId,
    description: form.description !== '' ? form.description : undefined,
    tags: form.tags,
    critical: form.critical,
    preferenceSettings: form.preferenceSettings,
    steps: stepsToSave,
  };
};
