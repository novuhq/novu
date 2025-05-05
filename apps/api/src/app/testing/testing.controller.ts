import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ProductFeatureKeyEnum, ResourceEnum } from '@novu/shared';

import { ApiExcludeController } from '@nestjs/swagger';
import { ResourceCategory } from '@novu/application-generic';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ProductFeature } from '../shared/decorators/product-feature.decorator';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';

@Controller('/testing')
@ApiExcludeController()
export class TestingController {
  @ExternalApiAccessible()
  @UserAuthentication()
  @Get('/product-feature')
  @ProductFeature(ProductFeatureKeyEnum.TRANSLATIONS)
  async productFeatureGet(): Promise<{ number: number }> {
    if (process.env.NODE_ENV !== 'test') throw new NotFoundException();

    return { number: Math.random() };
  }

  @ExternalApiAccessible()
  @UserAuthentication()
  @Get('/resource-limiting-default')
  async resourceLimitingDefaultGet(): Promise<{ number: number }> {
    if (process.env.NODE_ENV !== 'test') throw new NotFoundException();

    return { number: Math.random() };
  }

  @ExternalApiAccessible()
  @UserAuthentication()
  @Get('/resource-limiting-events')
  @ResourceCategory(ResourceEnum.EVENTS)
  async resourceLimitingEventsGet(): Promise<{ number: number }> {
    if (process.env.NODE_ENV !== 'test') throw new NotFoundException();

    return { number: Math.random() };
  }
}
