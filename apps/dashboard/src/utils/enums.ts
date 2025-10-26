export enum StepTypeEnum {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  CHAT = 'chat',
  PUSH = 'push',
  DIGEST = 'digest',
  TRIGGER = 'trigger',
  DELAY = 'delay',
  THROTTLE = 'throttle',
  CUSTOM = 'custom',
}

export enum ResourceTypeEnum {
  REGULAR = 'REGULAR',
  /** @deprecated Use BRIDGE instead */
  ECHO = 'ECHO',
  BRIDGE = 'BRIDGE',
}

export enum ResourceOriginEnum {
  NOVU_CLOUD = 'novu-cloud',
  NOVU_CLOUD_V1 = 'novu-cloud-v1',
  EXTERNAL = 'external',
}

export enum WorkflowStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
}
