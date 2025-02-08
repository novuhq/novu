import { Body, Controller, Get, NotFoundException, Post } from '@nestjs/common';
import { DalService } from '@novu/dal';
import { ProductFeatureKeyEnum, ResourceEnum } from '@novu/shared';

import { ApiExcludeController } from '@nestjs/swagger';
import { ResourceCategory } from '@novu/application-generic';
import { ISeedDataResponseDto, SeedDataBodyDto } from './dtos/seed-data.dto';
import { CreateSession } from './usecases/create-session/create-session.usecase';
import { CreateSessionCommand } from './usecases/create-session/create-session.command';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ProductFeature } from '../shared/decorators/product-feature.decorator';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';

@Controller('/testing')
@ApiExcludeController()
export class TestingController {
  constructor(
    // private seedDataUsecase: SeedData,
    private dalService: DalService,
    private createSessionUsecase: CreateSession
  ) {}

  @Post('/clear-db')
  async clearDB(@Body() body: SeedDataBodyDto): Promise<{ ok: boolean }> {
    if (process.env.NODE_ENV !== 'test') throw new NotFoundException();

    await this.dalService.destroy();

    return {
      ok: true,
    };
  }

  /**
   * Used for seeding data for client e2e tests,
   * Currently just creates a new user session and returns signed JWT
   */
  @Post('/session')
  async getSession(@Body() body: SeedDataBodyDto): Promise<ISeedDataResponseDto> {
    if (process.env.NODE_ENV !== 'test') throw new NotFoundException();
    const command = CreateSessionCommand.create({});

    return await this.createSessionUsecase.execute(command);
  }

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
