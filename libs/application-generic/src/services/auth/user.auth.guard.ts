import { Injectable, ExecutionContext, Inject } from '@nestjs/common';
import { IAuthGuard, IAuthModuleOptions } from '@nestjs/passport';
import { IJwtClaims } from '@novu/shared';
import { Observable } from 'rxjs';
import { Instrument } from '../../instrumentation';

@Injectable()
export class UserAuthGuard {
  constructor(@Inject('USER_AUTH_GUARD') private authGuard: IAuthGuard) {}

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
