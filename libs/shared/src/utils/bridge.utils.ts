import { ButtonTypeEnum, IMessage, IMessageCTA } from '../entities/messages';
import { ChannelCTATypeEnum, WorkflowTypeEnum } from '../types';

export const isBridgeWorkflow = (workflowType?: WorkflowTypeEnum): boolean => {
  return workflowType === WorkflowTypeEnum.BRIDGE || workflowType === WorkflowTypeEnum.ECHO;
};

/**
 * This typing already lives in @novu/framework, but due to a circular dependency, we currently
 * need to duplicate it here.
 *
 * TODO: reconsider the dependency tree between @novu/shared and @novu/framework and move this
 * function to be shared across all apps. We will likely want to create a separate package for
 * schemas and their inferred type definitions.
 */
type InAppOutput = {
  subject?: string;
  body: string;
  avatar?: string;
  primaryAction?: {
    label: string;
    url?: string;
  };
  secondaryAction?: {
    label: string;
    url?: string;
  };
};

type InAppMessage = Pick<IMessage, 'subject' | 'content' | 'cta' | 'avatar'>;

/**
 * This function maps the V2 InAppOutput to the V1 MessageEntity.
 */
export const inAppMessageFromBridgeOutputs = (outputs?: InAppOutput) => {
  const cta = {
    type: ChannelCTATypeEnum.REDIRECT,
    data: {},
    action: {
      result: {},
      buttons: [
        ...(outputs?.primaryAction
          ? [
              {
                type: ButtonTypeEnum.PRIMARY,
                content: outputs.primaryAction.label,
                url: outputs.primaryAction.url,
              },
            ]
          : []),
        ...(outputs?.secondaryAction
          ? [
              {
                type: ButtonTypeEnum.SECONDARY,
                content: outputs.secondaryAction.label,
                url: outputs.secondaryAction.url,
              },
            ]
          : []),
      ],
    },
  } satisfies IMessageCTA;

  return {
    subject: outputs?.subject,
    content: outputs?.body || '',
    cta,
    avatar: outputs?.avatar,
  } satisfies InAppMessage;
};
