import { MemberRoleEnum } from '../entities/organization/member.enum';

export enum SignUpOriginEnum {
  WEB = 'web',
  CLI = 'cli',
  VERCEL = 'vercel',
}

export enum PrincipalTypeEnum {
  USER = 'user',
  SERVICE_ACCOUNT = 'service_account',
}

export enum ServiceAccountScopeEnum {
  ENVIRONMENT = 'environment',
  ORGANIZATION = 'organization',
}

export enum ApiKeyTierEnum {
  ENVIRONMENT = 'sk',
  ORGANIZATION = 'sa',
}

export enum SigningSecretTypeEnum {
  SUBSCRIBER = 'subscriber',
  BRIDGE = 'bridge',
}

export enum SigningSecretStatusEnum {
  ACTIVE = 'active',
  REVOKED = 'revoked',
}

export type ApiKeyV2IdentityCacheData = {
  organizationId: string;
  serviceAccountId: string;
  serviceAccountName: string;
  serviceAccountScope: ServiceAccountScopeEnum;
  pinnedEnvironmentId?: string;
  permissions: PermissionsEnum[];
  apiKeyId: string;
};

export enum ApiKeyVerifyStatusEnum {
  VALID = 'VALID',
  NOT_FOUND = 'NOT_FOUND',
  EXPIRED = 'EXPIRED',
  DISABLED = 'DISABLED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
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
  scheme:
    | ApiAuthSchemeEnum.BEARER
    | ApiAuthSchemeEnum.API_KEY
    | ApiAuthSchemeEnum.API_KEY_V2
    | ApiAuthSchemeEnum.KEYLESS;
  environmentId: string;
  principalType?: PrincipalTypeEnum;
  serviceAccountId?: string;
  serviceAccountName?: string;
  serviceAccountScope?: ServiceAccountScopeEnum;
  pinnedEnvironmentId?: string;
  apiKeyId?: string;
};

export enum ApiAuthSchemeEnum {
  BEARER = 'Bearer',
  API_KEY = 'ApiKey',
  API_KEY_V2 = 'ApiKeyV2',
  KEYLESS = 'Keyless',
}

export enum PassportStrategyEnum {
  JWT = 'jwt',
  JWT_CLERK = 'jwt-clerk',
  JWT_BETTER_AUTH = 'jwt-better-auth',
  HEADER_API_KEY = 'headerapikey',
  KEYLESS = 'keyless',
}

export const NONE_AUTH_SCHEME = 'None';

export type AuthenticateContext = {
  invitationToken?: string;
  origin?: SignUpOriginEnum;
};

export enum PermissionsEnum {
  WORKFLOW_READ = 'org:workflow:read',
  WORKFLOW_WRITE = 'org:workflow:write',
  WEBHOOK_READ = 'org:webhook:read',
  WEBHOOK_WRITE = 'org:webhook:write',
  ENVIRONMENT_WRITE = 'org:environment:write',
  API_KEY_READ = 'org:apikey:read',
  API_KEY_WRITE = 'org:apikey:write',
  EVENT_WRITE = 'org:event:write',
  INTEGRATION_READ = 'org:integration:read',
  INTEGRATION_WRITE = 'org:integration:write',
  MESSAGE_READ = 'org:message:read',
  MESSAGE_WRITE = 'org:message:write',
  PARTNER_INTEGRATION_READ = 'org:partnerintegration:read',
  PARTNER_INTEGRATION_WRITE = 'org:partnerintegration:write',
  SUBSCRIBER_READ = 'org:subscriber:read',
  SUBSCRIBER_WRITE = 'org:subscriber:write',
  TOPIC_READ = 'org:topic:read',
  TOPIC_WRITE = 'org:topic:write',
  BILLING_WRITE = 'org:billing:write',
  ORG_METADATA_WRITE = 'org:metadata:write',
  NOTIFICATION_READ = 'org:notification:read',
  BRIDGE_WRITE = 'org:bridge:write',
  ORG_SETTINGS_WRITE = 'org:settings:write',
  ORG_SETTINGS_READ = 'org:settings:read',
  AGENT_READ = 'org:agent:read',
  AGENT_WRITE = 'org:agent:write',
}

export const ALL_PERMISSIONS = Object.values(PermissionsEnum);

export const ROLE_PERMISSIONS: Record<MemberRoleEnum, PermissionsEnum[]> = {
  [MemberRoleEnum.OWNER]: [
    PermissionsEnum.WORKFLOW_READ,
    PermissionsEnum.WORKFLOW_WRITE,
    PermissionsEnum.AGENT_READ,
    PermissionsEnum.AGENT_WRITE,
    PermissionsEnum.WEBHOOK_READ,
    PermissionsEnum.WEBHOOK_WRITE,
    PermissionsEnum.ENVIRONMENT_WRITE,
    PermissionsEnum.API_KEY_READ,
    PermissionsEnum.API_KEY_WRITE,
    PermissionsEnum.EVENT_WRITE,
    PermissionsEnum.INTEGRATION_READ,
    PermissionsEnum.INTEGRATION_WRITE,
    PermissionsEnum.MESSAGE_READ,
    PermissionsEnum.MESSAGE_WRITE,
    PermissionsEnum.PARTNER_INTEGRATION_READ,
    PermissionsEnum.PARTNER_INTEGRATION_WRITE,
    PermissionsEnum.SUBSCRIBER_READ,
    PermissionsEnum.SUBSCRIBER_WRITE,
    PermissionsEnum.TOPIC_READ,
    PermissionsEnum.TOPIC_WRITE,
    PermissionsEnum.BILLING_WRITE,
    PermissionsEnum.ORG_METADATA_WRITE,
    PermissionsEnum.NOTIFICATION_READ,
    PermissionsEnum.BRIDGE_WRITE,
    PermissionsEnum.ORG_SETTINGS_WRITE,
    PermissionsEnum.ORG_SETTINGS_READ,
  ],
  [MemberRoleEnum.ADMIN]: [
    PermissionsEnum.WORKFLOW_READ,
    PermissionsEnum.WORKFLOW_WRITE,
    PermissionsEnum.AGENT_READ,
    PermissionsEnum.AGENT_WRITE,
    PermissionsEnum.WEBHOOK_READ,
    PermissionsEnum.WEBHOOK_WRITE,
    PermissionsEnum.ENVIRONMENT_WRITE,
    PermissionsEnum.API_KEY_READ,
    PermissionsEnum.API_KEY_WRITE,
    PermissionsEnum.EVENT_WRITE,
    PermissionsEnum.INTEGRATION_READ,
    PermissionsEnum.INTEGRATION_WRITE,
    PermissionsEnum.MESSAGE_READ,
    PermissionsEnum.MESSAGE_WRITE,
    PermissionsEnum.PARTNER_INTEGRATION_READ,
    PermissionsEnum.PARTNER_INTEGRATION_WRITE,
    PermissionsEnum.SUBSCRIBER_READ,
    PermissionsEnum.SUBSCRIBER_WRITE,
    PermissionsEnum.TOPIC_READ,
    PermissionsEnum.TOPIC_WRITE,
    PermissionsEnum.ORG_METADATA_WRITE,
    PermissionsEnum.NOTIFICATION_READ,
    PermissionsEnum.BRIDGE_WRITE,
    PermissionsEnum.ORG_SETTINGS_WRITE,
    PermissionsEnum.ORG_SETTINGS_READ,
  ],
  [MemberRoleEnum.AUTHOR]: [
    PermissionsEnum.WORKFLOW_READ,
    PermissionsEnum.WORKFLOW_WRITE,
    PermissionsEnum.AGENT_READ,
    PermissionsEnum.AGENT_WRITE,
    PermissionsEnum.EVENT_WRITE,
    PermissionsEnum.INTEGRATION_READ,
    PermissionsEnum.INTEGRATION_WRITE,
    PermissionsEnum.MESSAGE_READ,
    PermissionsEnum.SUBSCRIBER_READ,
    PermissionsEnum.SUBSCRIBER_WRITE,
    PermissionsEnum.TOPIC_READ,
    PermissionsEnum.TOPIC_WRITE,
    PermissionsEnum.NOTIFICATION_READ,
    PermissionsEnum.BRIDGE_WRITE,
  ],
  [MemberRoleEnum.VIEWER]: [
    PermissionsEnum.WORKFLOW_READ,
    PermissionsEnum.AGENT_READ,
    PermissionsEnum.INTEGRATION_READ,
    PermissionsEnum.MESSAGE_READ,
    PermissionsEnum.SUBSCRIBER_READ,
    PermissionsEnum.TOPIC_READ,
    PermissionsEnum.NOTIFICATION_READ,
  ],
  [MemberRoleEnum.OSS_MEMBER]: [],
  [MemberRoleEnum.OSS_ADMIN]: [],
};

type UsedPermissions = (typeof ROLE_PERMISSIONS)[MemberRoleEnum][number];
type UnusedPermissions = Exclude<PermissionsEnum, UsedPermissions>;
type AssertAllPermissionsUsed = UnusedPermissions extends never ? true : `Missing permissions: ${UnusedPermissions}`;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _assertAllPermissionsUsed: AssertAllPermissionsUsed = true;
