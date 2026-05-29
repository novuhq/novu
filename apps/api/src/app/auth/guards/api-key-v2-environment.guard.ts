import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiAuthSchemeEnum, PrincipalTypeEnum, ServiceAccountScopeEnum } from '@novu/shared';
import { ServiceAccountRepository } from '@novu/dal';

export const REQUIRES_ENVIRONMENT_KEY = 'requiresEnvironment';

@Injectable()
export class ApiKeyV2EnvironmentGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly serviceAccountRepository: ServiceAccountRepository
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresEnvironment =
      this.reflector.get<boolean>(REQUIRES_ENVIRONMENT_KEY, context.getHandler()) ??
      this.reflector.get<boolean>(REQUIRES_ENVIRONMENT_KEY, context.getClass()) ??
      true;

    if (!requiresEnvironment) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user, authScheme } = request;

    if (authScheme !== ApiAuthSchemeEnum.API_KEY_V2 || user?.principalType !== PrincipalTypeEnum.SERVICE_ACCOUNT) {
      return true;
    }

    if (user.environmentId) {
      return true;
    }

    if (!user.serviceAccountId) {
      return true;
    }

    const serviceAccount = await this.serviceAccountRepository.findById(
      {
        _id: user.serviceAccountId,
        _organizationId: user.organizationId,
      },
      ['scope']
    );

    if (serviceAccount?.scope !== ServiceAccountScopeEnum.ORGANIZATION) {
      return true;
    }

    throw new BadRequestException(
      'Novu-Environment-Id header is required for this endpoint when using an organization-scoped API key'
    );
  }
}
