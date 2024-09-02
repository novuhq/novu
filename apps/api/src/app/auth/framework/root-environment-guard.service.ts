import { CanActivate, ExecutionContext, forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '@novu/application-generic';

@Injectable()
export class RootEnvironmentGuard implements CanActivate {
  constructor(@Inject(forwardRef(() => AuthService)) private authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const { user } = request;

    const environment = await this.authService.isRootEnvironment(user);

    if (environment) {
      throw new UnauthorizedException('This action is only allowed in Development environment');
    }

    return true;
  }
}
