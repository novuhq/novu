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
  scheme: ApiAuthSchemeEnum.BEARER | ApiAuthSchemeEnum.API_KEY;
  environmentId: string;
};

export enum ApiAuthSchemeEnum {
  BEARER = 'Bearer',
  API_KEY = 'ApiKey',
}

export enum PassportStrategyEnum {
  JWT = 'jwt',
  JWT_CLERK = 'jwt-clerk',
  HEADER_API_KEY = 'headerapikey',
}

export const NONE_AUTH_SCHEME = 'None';

export type AuthenticateContext = {
  invitationToken?: string;
  origin?: SignUpOriginEnum;
};

export enum PermissionsEnum {
  // Workflows
  WORKFLOW_READ = 'org:workflow:read',
  WORKFLOW_CREATE = 'org:workflow:create',
  WORKFLOW_DELETE = 'org:workflow:delete',

  // Environments
  ENVIRONMENT_READ = 'org:environment:read',
  ENVIRONMENT_CREATE = 'org:environment:create',
  ENVIRONMENT_UPDATE = 'org:environment:update',
  ENVIRONMENT_DELETE = 'org:environment:delete',

  // Events
  EVENT_CREATE = 'org:event:create',
  EVENT_DELETE = 'org:event:delete',

  // Integrations
  INTEGRATION_READ = 'org:integration:read',
  INTEGRATION_CREATE = 'org:integration:create',
  INTEGRATION_UPDATE = 'org:integration:update',
  INTEGRATION_DELETE = 'org:integration:delete',

  // Messages
  MESSAGE_READ = 'org:message:read',
  MESSAGE_DELETE = 'org:message:delete',

  // Partner Integrations
  PARTNER_INTEGRATION_READ = 'org:partner-integration:read',
  PARTNER_INTEGRATION_CREATE = 'org:partner-integration:create',
  PARTNER_INTEGRATION_UPDATE = 'org:partner-integration:update',

  // Subscribers
  SUBSCRIBER_READ = 'org:subscriber:read',
  SUBSCRIBER_CREATE = 'org:subscriber:create',
  SUBSCRIBER_UPDATE = 'org:subscriber:update',
  SUBSCRIBER_DELETE = 'org:subscriber:delete',

  // Topics
  TOPIC_READ = 'org:topic:read',
  TOPIC_CREATE = 'org:topic:create',
  TOPIC_UPDATE = 'org:topic:update',
  TOPIC_DELETE = 'org:topic:delete',

  // Billing
  BILLING_PORTAL_ACCESS = 'org:billing:portal:access',
  BILLING_SUBSCRIPTION_READ = 'org:billing:subscription:read',
  BILLING_SUBSCRIPTION_CREATE = 'org:billing:subscription:create',

  // Org Metadata
  ORG_METADATA_UPDATE = 'org:metadata:update',

  // Notifications
  NOTIFICATION_READ = 'org:notification:read',
}
