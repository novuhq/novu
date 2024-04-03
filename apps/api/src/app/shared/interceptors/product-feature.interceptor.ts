import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationRepository } from '@novu/dal';
import {
  ApiServiceLevelEnum,
  IJwtPayload,
  productFeatureEnabledForServiceLevel,
  ProductFeatureKeyEnum,
} from '@novu/shared';
import { Observable } from 'rxjs';
import { ProductFeature } from '../decorators/product-feature.decorator';

@Injectable()
export class ProductFeatureInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector, private organizationRepository: OrganizationRepository) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    try {
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
        organization?.apiServiceLevel as ApiServiceLevelEnum
      );

      if (!enabled) {
        throw new HttpException('Payment Required', 402);
      }

      return next.handle();
    } catch (error) {
      throw error;
    }
  }

  private getReqUser(context: ExecutionContext): IJwtPayload {
    const req = context.switchToHttp().getRequest();

    return req.user;
  }
}
