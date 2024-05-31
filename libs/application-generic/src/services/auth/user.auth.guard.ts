import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IAuthGuard, IAuthModuleOptions } from '@nestjs/passport';
import { IJwtClaims } from '@novu/shared';
import { CommunityUserAuthGuard } from './community.user.auth.guard';
import { Observable } from 'rxjs';
import { Instrument } from '../../instrumentation';
import { PlatformException } from '../../utils/exceptions';

function initiateAuthGuard(reflector: Reflector) {
  try {
    if (process.env.NOVU_ENTERPRISE === 'true') {
      const eeAuthModule = require('@novu/ee-auth');
      if (!eeAuthModule?.EEUserAuthGuard) {
        throw new PlatformException('EEUserAuthGuard is not loaded');
      }

      return new eeAuthModule.EEUserAuthGuard(reflector);
    } else {
      return new CommunityUserAuthGuard(reflector);
    }
  } catch (e) {
    Logger.error(
      e,
      'Unexpected error while importing enterprise modules',
      'EEUserAuthGuard'
    );
    throw e;
  }
}

@Injectable()
export class UserAuthGuard {
  private readonly authGuard: IAuthGuard;

  constructor(reflector: Reflector) {
    this.authGuard = initiateAuthGuard(reflector);
  }

  @Instrument()
  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    return this.authGuard.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext): IAuthModuleOptions<any> {
    return this.authGuard.getAuthenticateOptions(context);
  }

  handleRequest<TUser = IJwtClaims>(
    err: any,
    user: IJwtClaims | false,
    info: any,
    context: ExecutionContext,
    status?: any
  ): TUser {
    return this.authGuard.handleRequest(err, user, info, context, status);
  }
}
