import { DelayTypeEnum, DigestTypeEnum, StepTypeEnum, TimeUnitEnum } from '@novu/shared';

export const AUTOCOMPLETE_PASSWORD_MANAGERS_OFF = {
  autoComplete: 'off',
  'data-1p-ignore': true,
  'data-form-type': 'other',
};

export const INLINE_CONFIGURABLE_STEP_TYPES: readonly StepTypeEnum[] = [
  StepTypeEnum.DELAY,
  StepTypeEnum.DIGEST,
  StepTypeEnum.THROTTLE,
];

export const TEMPLATE_CONFIGURABLE_STEP_TYPES: readonly StepTypeEnum[] = [
  StepTypeEnum.IN_APP,
  StepTypeEnum.EMAIL,
  StepTypeEnum.SMS,
  StepTypeEnum.CHAT,
  StepTypeEnum.PUSH,
  StepTypeEnum.HTTP_REQUEST,
];

export const STEP_RESOLVER_SUPPORTED_STEP_TYPES: readonly StepTypeEnum[] = [
  StepTypeEnum.IN_APP,
  StepTypeEnum.EMAIL,
  StepTypeEnum.SMS,
  StepTypeEnum.CHAT,
  StepTypeEnum.PUSH,
  StepTypeEnum.DELAY,
  StepTypeEnum.DIGEST,
  StepTypeEnum.THROTTLE,
];

export const STEP_TYPE_LABELS: Record<StepTypeEnum, string> = {
  [StepTypeEnum.EMAIL]: 'Email',
  [StepTypeEnum.SMS]: 'SMS',
  [StepTypeEnum.IN_APP]: 'In-App',
  [StepTypeEnum.CHAT]: 'Chat',
  [StepTypeEnum.PUSH]: 'Push',
  [StepTypeEnum.DIGEST]: 'Digest',
  [StepTypeEnum.DELAY]: 'Delay',
  [StepTypeEnum.THROTTLE]: 'Throttle',
  [StepTypeEnum.TRIGGER]: 'Trigger',
  [StepTypeEnum.CUSTOM]: 'Custom',
  [StepTypeEnum.HTTP_REQUEST]: 'HTTP Request',
};

export const DEFAULT_CONTROL_DELAY_AMOUNT = 30;
export const DEFAULT_CONTROL_DELAY_UNIT = TimeUnitEnum.SECONDS;
export const DEFAULT_CONTROL_DELAY_TYPE = DelayTypeEnum.REGULAR;
export const DEFAULT_CONTROL_DELAY_CRON = '';

export const DEFAULT_CONTROL_DIGEST_AMOUNT = 30;
export const DEFAULT_CONTROL_DIGEST_UNIT = TimeUnitEnum.SECONDS;
export const DEFAULT_CONTROL_DIGEST_CRON = '';
export const DEFAULT_CONTROL_DIGEST_TYPE = DigestTypeEnum.REGULAR;
export const DEFAULT_CONTROL_DIGEST_DIGEST_KEY = '';

export const DEFAULT_CONTROL_THROTTLE_TYPE = 'fixed';
export const DEFAULT_CONTROL_THROTTLE_WINDOW = 1;
export const DEFAULT_CONTROL_THROTTLE_UNIT = TimeUnitEnum.MINUTES;
export const DEFAULT_CONTROL_THROTTLE_THRESHOLD = 1;

export const DEFAULT_CONTROL_HTTP_REQUEST_METHOD = 'POST';
export const DEFAULT_CONTROL_HTTP_REQUEST_HEADERS: unknown[] = [];
export const DEFAULT_CONTROL_HTTP_REQUEST_BODY: unknown[] = [];
export const DEFAULT_CONTROL_HTTP_REQUEST_RESPONSE_BODY_SCHEMA = { type: 'object', properties: {} };
export const DEFAULT_CONTROL_HTTP_REQUEST_ENFORCE_SCHEMA_VALIDATION = false;
export const DEFAULT_CONTROL_HTTP_REQUEST_CONTINUE_ON_FAILURE = false;
export const DEFAULT_CONTROL_HTTP_REQUEST_TIMEOUT = 5000;
