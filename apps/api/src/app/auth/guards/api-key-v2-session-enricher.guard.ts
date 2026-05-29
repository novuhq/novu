import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { HttpRequestHeaderKeysEnum } from '@novu/application-generic';
import { ApiAuthSchemeEnum, ServiceAccountScopeEnum } from '@novu/shared';

import { ApiKeyV2AuthService } from '../services/api-key-v2-auth.service';

@Injectable()
export class ApiKeyV2SessionEnricherGuard implements CanActivate {
  constructor(private readonly apiKeyV2AuthService: ApiKeyV2AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user || user.scheme !== ApiAuthSchemeEnum.API_KEY_V2 || !user.serviceAccountId) {
      return true;
    }

    const environmentIdHeader = request.headers[HttpRequestHeaderKeysEnum.NOVU_ENVIRONMENT_ID.toLowerCase()];
    const environmentIdFromHeader = Array.isArray(environmentIdHeader)
      ? environmentIdHeader[0]
      : environmentIdHeader;

    const identity = {
      organizationId: user.organizationId,
      serviceAccountId: user.serviceAccountId,
      serviceAccountName: user.serviceAccountName ?? '',
      serviceAccountScope: user.serviceAccountScope ?? ServiceAccountScopeEnum.ENVIRONMENT,
      pinnedEnvironmentId: user.pinnedEnvironmentId,
      permissions: user.permissions,
      apiKeyId: user.apiKeyId ?? '',
    };

    request.user = await this.apiKeyV2AuthService.buildSession(identity, environmentIdFromHeader);

    return true;
  }
}
