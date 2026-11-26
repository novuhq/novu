import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SubscriberSession } from '../shared/framework/user.decorator';
import {
  UpdateSubscriberOnlineStateRequestDto,
  UpdateSubscriberOnlineStateResponseDto,
} from './dtos/subscriber-online-state.dto';
import { StatelessSubscriberSession } from './subscriber-jwt-stateless.strategy';
import { SubscriberPresenceAuthGuard } from './subscriber-presence-auth.guard';
import { UpdateSubscriberOnlineStateCommand } from './usecases/update-subscriber-online-state/update-subscriber-online-state.command';
import { UpdateSubscriberOnlineState } from './usecases/update-subscriber-online-state/update-subscriber-online-state.usecase';

@Controller('/internal')
@ApiExcludeController()
export class InternalController {
  constructor(private readonly updateSubscriberOnlineStateUsecase: UpdateSubscriberOnlineState) {}

  @Post('/subscriber-online-state')
  // Stateless guard: called on every socket connect/disconnect, so it must not load the subscriber
  @UseGuards(SubscriberPresenceAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateSubscriberOnlineState(
    @Body() body: UpdateSubscriberOnlineStateRequestDto,
    @SubscriberSession() subscriberSession: StatelessSubscriberSession
  ): Promise<UpdateSubscriberOnlineStateResponseDto> {
    const command = UpdateSubscriberOnlineStateCommand.create({
      subscriberId: subscriberSession.subscriberId,
      environmentId: subscriberSession._environmentId,
      isOnline: body.isOnline,
      timestamp: body.timestamp ?? Date.now(),
    });

    return await this.updateSubscriberOnlineStateUsecase.execute(command);
  }
}
