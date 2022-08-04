import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CreateSubscriber, CreateSubscriberCommand } from './usecases/create-subscriber';
import { UpdateSubscriber, UpdateSubscriberCommand } from './usecases/update-subscriber';
import { RemoveSubscriber, RemoveSubscriberCommand } from './usecases/remove-subscriber';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { IJwtPayload } from '@novu/shared';
import { CreateSubscriberBodyDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberBodyDto } from './dto/update-subscriber.dto';
import { GetSubscribers } from './usecases/get-subscribers';
import { GetSubscribersCommand } from './usecases/get-subscribers';
import { UpdateSubscriberPreferenceDto } from '../widgets/dtos/update-subscriber-preference.dto';
import { UpdateSubscriberPreferenceCommand } from '../widgets/usecases/update-subscriber-preference';
import { GetPreferences } from './usecases/get-preferences/get-preferences.usecase';
import { GetPreferencesCommand } from './usecases/get-preferences/get-preferences.command';
import { UpdatePreference } from './usecases/update-preference/update-preference.usecase';

@Controller('/subscribers')
export class SubscribersController {
  constructor(
    private createSubscriberUsecase: CreateSubscriber,
    private updateSubscriberUsecase: UpdateSubscriber,
    private removeSubscriberUsecase: RemoveSubscriber,
    private getSubscribersUsecase: GetSubscribers,
    private getPreferenceUsecase: GetPreferences,
    private updatePreferenceUsecase: UpdatePreference
  ) {}

  @Get('')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  async getSubscribers(@UserSession() user: IJwtPayload, @Query('page') page = 0) {
    return await this.getSubscribersUsecase.execute(
      GetSubscribersCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        page: page ? Number(page) : 0,
      })
    );
  }

  @Post('/')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  async createSubscriber(@UserSession() user: IJwtPayload, @Body() body: CreateSubscriberBodyDto) {
    return await this.createSubscriberUsecase.execute(
      CreateSubscriberCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId: body.subscriberId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        avatar: body.avatar,
      })
    );
  }

  @Put('/:subscriberId')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  async updateSubscriber(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string,
    @Body() body: UpdateSubscriberBodyDto
  ) {
    return await this.updateSubscriberUsecase.execute(
      UpdateSubscriberCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        avatar: body.avatar,
      })
    );
  }

  @Delete('/:subscriberId')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  async removeSubscriber(@UserSession() user: IJwtPayload, @Param('subscriberId') subscriberId: string) {
    return await this.removeSubscriberUsecase.execute(
      RemoveSubscriberCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
      })
    );
  }

  @Get('/:subscriberId/preferences')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  async getSubscriberPreference(@UserSession() user: IJwtPayload, @Param('subscriberId') subscriberId: string) {
    const command = GetPreferencesCommand.create({
      organizationId: user.organizationId,
      subscriberId: subscriberId,
      environmentId: user.environmentId,
    });

    return await this.getPreferenceUsecase.execute(command);
  }

  @Patch('/:subscriberId/preference/:templateId')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  async updateSubscriberPreference(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string,
    @Param('templateId') templateId: string,
    @Body() body: UpdateSubscriberPreferenceDto
  ) {
    const command = UpdateSubscriberPreferenceCommand.create({
      organizationId: user.organizationId,
      subscriberId: subscriberId,
      environmentId: user.environmentId,
      templateId: templateId,
      channel: body.channel,
      enabled: body.enabled,
    });

    return await this.updatePreferenceUsecase.execute(command);
  }
}
