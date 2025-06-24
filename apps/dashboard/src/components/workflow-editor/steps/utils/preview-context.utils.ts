import { WorkflowResponseDto, ISubscriberResponseDto, StepTypeEnum, IUserEntity, DEFAULT_LOCALE } from '@novu/shared';
import { ParsedData, PreviewSubscriberData } from '../types/preview-context.types';
import { STEP_TYPE_ICONS, DEFAULT_STEP_ICON } from '../constants/preview-context.constants';

export function parseJsonValue(value: string): ParsedData {
  try {
    const parsed = JSON.parse(value || '{}');
    return {
      payload: parsed.payload || {},
      subscriber: parsed.subscriber || {},
      steps: parsed.steps || {},
    };
  } catch {
    return {
      payload: {},
      subscriber: {},
      steps: {},
    };
  }
}

export function createSubscriberData(subscriber: ISubscriberResponseDto): PreviewSubscriberData {
  return {
    subscriberId: subscriber.subscriberId,
    firstName: subscriber.firstName || '',
    lastName: subscriber.lastName || '',
    email: subscriber.email || '',
    phone: subscriber.phone || '',
    avatar: subscriber.avatar || '',
    locale: subscriber.locale || DEFAULT_LOCALE,
    timezone: subscriber.timezone || '',
    data: {},
  };
}

export function createSubscriberDataFromUser(user: IUserEntity): PreviewSubscriberData {
  return {
    subscriberId: user.email || user._id,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phone: '',
    avatar: user.profilePicture || '',
    locale: DEFAULT_LOCALE,
  };
}

export function getStepName(workflow?: WorkflowResponseDto, stepId?: string): string {
  const step = workflow?.steps?.find((s) => s.stepId === stepId);
  return step?.name || stepId || 'Unknown Step';
}

export function getStepType(workflow?: WorkflowResponseDto, stepId?: string): StepTypeEnum | undefined {
  const step = workflow?.steps?.find((s) => s.stepId === stepId);
  return step?.type;
}

export function getStepTypeIcon(stepType?: StepTypeEnum) {
  if (!stepType) return DEFAULT_STEP_ICON;

  return STEP_TYPE_ICONS[stepType] || DEFAULT_STEP_ICON;
}
