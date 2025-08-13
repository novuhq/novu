import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProductFeature } from '@novu/application-generic';
import { CommunityOrganizationRepository } from '@novu/dal';
import {
  ApiServiceLevelEnum,
  ProductFeatureKeyEnum,
  productFeatureEnabledForServiceLevel,
  UserSessionData,
} from '@novu/shared';
import { Observable } from 'rxjs';

@Injectable()
export class ProductFeatureInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private organizationRepository: CommunityOrganizationRepository
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const handler = context.getHandler();
    const classRef = context.getClass();
    const requestedFeature: ProductFeatureKeyEnum | undefined = this.reflector.getAllAndOverride(ProductFeature, [
      handler,
      classRef,
    ]);

    if (requestedFeature === undefined) {
      return next.handle();
    }

    const user = this.getReqUser(context);

    if (!user) {
      throw new UnauthorizedException();
    }

    const { organizationId } = user;

    const organization = await this.organizationRepository.findById(organizationId);

    const enabled = productFeatureEnabledForServiceLevel[requestedFeature].includes(
      organization?.apiServiceLevel || ApiServiceLevelEnum.FREE
    );

    if (!enabled) {
      // TODO: Reuse PaymentRequiredException from EE billing module.
      throw new HttpException('Payment Required', 402);
    }

    return next.handle();
  }

  private getReqUser(context: ExecutionContext): UserSessionData {
    const req = context.switchToHttp().getRequest();

    return req.user;
  }
}
