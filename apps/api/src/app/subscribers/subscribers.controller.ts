import { Body, Controller, Delete, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CreateSubscriber, CreateSubscriberCommand } from './usecases/create-subscriber';
import { UpdateSubscriber, UpdateSubscriberCommand } from './usecases/update-subscriber';
import { RemoveSubscriber, RemoveSubscriberCommand } from './usecases/remove-subscriber';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { IJwtPayload } from '@novu/shared';
import { CreateSubscriberBodyDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberBodyDto } from './dto/update-subscriber.dto';

@Controller('/subscribers')
export class SubscribersController {
  constructor(
    private createSubscriberUsecase: CreateSubscriber,
    private updateSubscriberUsecase: UpdateSubscriber,
    private removeSubscriberUsecase: RemoveSubscriber
  ) {}

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
        applicationId: user.applicationId,
        organizationId: user.organizationId,
        subscriberId,
      })
    );
  }
}
