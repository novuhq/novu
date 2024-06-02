import { Inject, Injectable, Logger } from '@nestjs/common';

export interface IAuthService {
  authenticate(...args: any[]): any;
  refreshToken(...args: any[]): any;
  isAuthenticatedForOrganization(...args: any[]): any;
  validateApiKey(...args: any[]): any;
  getSubscriberWidgetToken(...args: any[]): any;
  generateUserToken(...args: any[]): any;
  getSignedToken(...args: any[]): any;
  validateUser(...args: any[]): any;
  validateSubscriber(...args: any[]): any;
  isRootEnvironment(...args: any[]): any;
}

@Injectable()
export class AuthService implements IAuthService {
  private authService: IAuthService;

  constructor(@Inject('AUTH_SERVICE') authService: IAuthService) {
    this.authService = authService;
  }

  authenticate(...args: any[]): any {
    return this.authService.authenticate(...args);
  }

  refreshToken(...args: any[]): any {
    return this.authService.refreshToken(...args);
  }

  isAuthenticatedForOrganization(...args: any[]): any {
    return this.authService.isAuthenticatedForOrganization(...args);
  }

  validateApiKey(...args: any[]): any {
    return this.authService.validateApiKey(...args);
  }

  getSubscriberWidgetToken(...args: any[]): any {
    return this.authService.getSubscriberWidgetToken(...args);
  }

  generateUserToken(...args: any[]): any {
    return this.authService.generateUserToken(...args);
  }

  getSignedToken(...args: any[]): any {
    return this.authService.getSignedToken(...args);
  }

  validateUser(...args: any[]): any {
    return this.authService.validateUser(...args);
  }

  validateSubscriber(...args: any[]): any {
    return this.authService.validateSubscriber(...args);
  }

  isRootEnvironment(...args: any[]): any {
    return this.authService.isRootEnvironment(...args);
  }
}
