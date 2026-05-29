import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiKeyCredentialRepository, EnvironmentRepository, ServiceAccountRepository } from '@novu/dal';
import { hashApiKey, isV2ApiKey } from '@novu/application-generic';
import {
  ALL_PERMISSIONS,
  ApiAuthSchemeEnum,
  ApiKeyV2IdentityCacheData,
  ApiKeyVerifyStatusEnum,
  MemberRoleEnum,
  PrincipalTypeEnum,
  ServiceAccountScopeEnum,
  UserSessionData,
} from '@novu/shared';

export type ApiKeyV2CachedIdentity = ApiKeyV2IdentityCacheData;

export type ApiKeyV2AuthResult =
  | { status: ApiKeyVerifyStatusEnum.VALID; identity: ApiKeyV2CachedIdentity }
  | { status: ApiKeyVerifyStatusEnum.NOT_FOUND }
  | { status: ApiKeyVerifyStatusEnum.EXPIRED }
  | { status: ApiKeyVerifyStatusEnum.DISABLED };

@Injectable()
export class ApiKeyV2AuthService {
  constructor(
    private readonly apiKeyCredentialRepository: ApiKeyCredentialRepository,
    private readonly serviceAccountRepository: ServiceAccountRepository,
    private readonly environmentRepository: EnvironmentRepository
  ) {}

  isV2ApiKey(apiKey: string): boolean {
    return isV2ApiKey(apiKey);
  }

  async resolveIdentity(apiKey: string): Promise<ApiKeyV2AuthResult> {
    const hash = hashApiKey(apiKey);
    const keyCredential = await this.apiKeyCredentialRepository.findByHashForAuth(hash);

    if (!keyCredential) {
      return { status: ApiKeyVerifyStatusEnum.NOT_FOUND };
    }

    if (keyCredential.revokedAt) {
      return { status: ApiKeyVerifyStatusEnum.DISABLED };
    }

    if (keyCredential.expiresAt && new Date(keyCredential.expiresAt) < new Date()) {
      return { status: ApiKeyVerifyStatusEnum.EXPIRED };
    }

    const serviceAccount = await this.serviceAccountRepository.findById(
      {
        _id: keyCredential._serviceAccountId,
        _organizationId: keyCredential._organizationId,
      },
      '*'
    );

    if (!serviceAccount) {
      return { status: ApiKeyVerifyStatusEnum.NOT_FOUND };
    }

    const permissions =
      keyCredential.permissions.length > 0 ? keyCredential.permissions : serviceAccount.defaultPermissions;

    await this.apiKeyCredentialRepository.updateLastUsedAt(keyCredential._id, keyCredential._organizationId);

    return {
      status: ApiKeyVerifyStatusEnum.VALID,
      identity: {
        organizationId: keyCredential._organizationId,
        serviceAccountId: serviceAccount._id,
        serviceAccountName: serviceAccount.name,
        serviceAccountScope: serviceAccount.scope,
        pinnedEnvironmentId: serviceAccount._environmentId,
        permissions: permissions.length > 0 ? permissions : ALL_PERMISSIONS,
        apiKeyId: keyCredential._id,
      },
    };
  }

  async buildSession(identity: ApiKeyV2CachedIdentity, environmentIdFromHeader?: string): Promise<UserSessionData> {
    const environmentId = await this.resolveEnvironmentId(identity, environmentIdFromHeader);

    return {
      _id: identity.serviceAccountId,
      organizationId: identity.organizationId,
      environmentId,
      roles: [MemberRoleEnum.OSS_ADMIN],
      permissions: identity.permissions,
      scheme: ApiAuthSchemeEnum.API_KEY_V2,
      principalType: PrincipalTypeEnum.SERVICE_ACCOUNT,
      serviceAccountId: identity.serviceAccountId,
      serviceAccountName: identity.serviceAccountName,
      serviceAccountScope: identity.serviceAccountScope,
      pinnedEnvironmentId: identity.pinnedEnvironmentId,
      apiKeyId: identity.apiKeyId,
    };
  }

  private async resolveEnvironmentId(
    identity: ApiKeyV2CachedIdentity,
    environmentIdFromHeader?: string
  ): Promise<string> {
    if (identity.serviceAccountScope === ServiceAccountScopeEnum.ENVIRONMENT) {
      if (!identity.pinnedEnvironmentId) {
        throw new UnauthorizedException('Environment-scoped service account is missing environment binding');
      }

      return identity.pinnedEnvironmentId;
    }

    if (environmentIdFromHeader) {
      const environment = await this.environmentRepository.findOne(
        {
          _id: environmentIdFromHeader,
          _organizationId: identity.organizationId,
        },
        '_id'
      );

      if (!environment) {
        throw new UnauthorizedException('Cannot find environment for organization');
      }

      return environmentIdFromHeader;
    }

    return '';
  }
}
