export enum StepTypeEnum {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  CHAT = 'chat',
  PUSH = 'push',
  DIGEST = 'digest',
  TRIGGER = 'trigger',
  DELAY = 'delay',
  CUSTOM = 'custom',
}

export enum WorkflowTypeEnum {
  REGULAR = 'REGULAR',
  ECHO = 'ECHO', // @deprecated
  BRIDGE = 'BRIDGE',
}

export enum WorkflowOriginEnum {
  NOVU_CLOUD = 'novu-cloud',
  NOVU_CLOUD_V1 = 'novu-cloud-v1',
  EXTERNAL = 'external',
}

export enum WorkflowStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
}
