import { MemberRoleEnum } from '../entities/organization/member.enum';

export enum SignUpOriginEnum {
  WEB = 'web',
  CLI = 'cli',
  VERCEL = 'vercel',
}

export type UserSessionData = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePicture?: string;
  organizationId: string;
  roles: MemberRoleEnum[];
  permissions: PermissionsEnum[];
  scheme: ApiAuthSchemeEnum.BEARER | ApiAuthSchemeEnum.API_KEY | ApiAuthSchemeEnum.KEYLESS;
  environmentId: string;
};

export enum ApiAuthSchemeEnum {
  BEARER = 'Bearer',
  API_KEY = 'ApiKey',
  KEYLESS = 'Keyless',
}

export enum PassportStrategyEnum {
  JWT = 'jwt',
  JWT_CLERK = 'jwt-clerk',
  HEADER_API_KEY = 'headerapikey',
  KEYLESS = 'keyless',
}

export const NONE_AUTH_SCHEME = 'None';

export type AuthenticateContext = {
  invitationToken?: string;
  origin?: SignUpOriginEnum;
};

export enum PermissionsEnum {
  // Workflows
  WORKFLOW_READ = 'org:workflow:read',
  WORKFLOW_WRITE = 'org:workflow:write',

  // Webhooks
  WEBHOOK_READ = 'org:webhook:read',
  WEBHOOK_WRITE = 'org:webhook:write',

  // Environments
  ENVIRONMENT_WRITE = 'org:environment:write',

  // API keys
  API_KEY_READ = 'org:apikey:read',
  API_KEY_WRITE = 'org:apikey:write',

  // Events
  EVENT_WRITE = 'org:event:write',

  // Integrations
  INTEGRATION_READ = 'org:integration:read',
  INTEGRATION_WRITE = 'org:integration:write',

  // Messages
  MESSAGE_READ = 'org:message:read',
  MESSAGE_WRITE = 'org:message:write',

  // Partner Integrations
  PARTNER_INTEGRATION_READ = 'org:partnerintegration:read',
  PARTNER_INTEGRATION_WRITE = 'org:partnerintegration:write',

  // Subscribers
  SUBSCRIBER_READ = 'org:subscriber:read',
  SUBSCRIBER_WRITE = 'org:subscriber:write',

  // Topics
  TOPIC_READ = 'org:topic:read',
  TOPIC_WRITE = 'org:topic:write',

  // Billing
  BILLING_WRITE = 'org:billing:write',

  // Org Metadata
  ORG_METADATA_WRITE = 'org:metadata:write',

  // Notifications
  NOTIFICATION_READ = 'org:notification:read',

  // Bridge endpoint
  BRIDGE_WRITE = 'org:bridge:write',

  // Organization Settings
  ORG_SETTINGS_WRITE = 'org:settings:write',
  ORG_SETTINGS_READ = 'org:settings:read',
}

export const ALL_PERMISSIONS = Object.values(PermissionsEnum);
