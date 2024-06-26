import {
  AuthService,
  SwitchEnvironment,
  SwitchOrganization,
  injectRepositories,
  PlatformException,
} from '@novu/application-generic';
import { RolesGuard } from './framework/roles.guard';
import { RootEnvironmentGuard } from './framework/root-environment-guard.service';
import {
  HttpException,
  HttpStatus,
  MiddlewareConsumer,
  ModuleMetadata,
  NestMiddleware,
  Provider,
  RequestMethod,
} from '@nestjs/common';
import {
  EnvironmentRepository,
  MemberRepository,
  OrganizationRepository,
  UserRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ApiKeyStrategy } from './services/passport/apikey.strategy';
import { JwtSubscriberStrategy } from './services/passport/subscriber-jwt.strategy';
import { NextFunction } from 'express';

export function getEEModuleConfig(): ModuleMetadata {
  const eeAuthPackage = require('@novu/ee-auth');
  const eeAuthModule = eeAuthPackage?.eEAuthModule;

  if (!eeAuthModule) {
    throw new PlatformException('ee-auth module is not loaded');
  }

  return {
    imports: [...eeAuthModule.imports],
    controllers: [...eeAuthModule.controllers],
    providers: [
      ...eeAuthModule.providers,
      // original repositories need to be here for the DI to work
      ...injectRepositories(),
      UserRepository,
      MemberRepository,
      OrganizationRepository,
      EnvironmentRepository,
      SubscriberRepository,
      // reused services
      ApiKeyStrategy,
      JwtSubscriberStrategy,
      AuthService,
      SwitchEnvironment,
      SwitchOrganization,
      RolesGuard,
      RootEnvironmentGuard,
    ],
    exports: [
      ...eeAuthModule.exports,
      RolesGuard,
      RootEnvironmentGuard,
      AuthService,
      'USER_REPOSITORY',
      'MEMBER_REPOSITORY',
      'ORGANIZATION_REPOSITORY',
    ],
  };
}

export function configure(consumer: MiddlewareConsumer) {
  consumer.apply(DomainRestrictionMiddleware).forRoutes(
    { path: '/users/', method: RequestMethod.POST },
    {
      path: '/organizations/',
      method: RequestMethod.POST,
    }
  );
}

class DomainRestrictionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const allowedDomains = [process.env.FRONT_BASE_URL];
    const origin = (req.headers as any)?.origin || '';

    if (origin && allowedDomains.includes(origin)) {
      next();
    } else {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
  }
}
