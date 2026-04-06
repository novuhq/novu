import { DEFAULT_LOCALE, ISubscriberResponseDto, StepTypeEnum, WorkflowResponseDto } from '@novu/shared';
import { DEFAULT_STEP_ICON, STEP_TYPE_ICONS } from '../constants/preview-context.constants';
import { ParsedData, PreviewSubscriberData } from '../types/preview-context.types';

export function parseJsonValue(value: string): ParsedData {
  try {
    const parsed = JSON.parse(value || '{}');

    return {
      payload: parsed.payload || {},
      subscriber: parsed.subscriber || {},
      steps: parsed.steps || {},
      context: parsed.context || {},
      env: parsed.env || {},
    };
  } catch {
    return {
      payload: {},
      subscriber: {},
      steps: {},
      context: {},
      env: {},
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
    data: subscriber.data || {},
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
