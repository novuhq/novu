import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiExcludeController } from '@nestjs/swagger';
import { SubscriberEntity } from '@novu/dal';
import { SubscriberSession } from '../shared/framework/user.decorator';
import {
  UpdateSubscriberOnlineStateRequestDto,
  UpdateSubscriberOnlineStateResponseDto,
} from './dtos/subscriber-online-state.dto';
import { UpdateSubscriberOnlineStateCommand } from './usecases/update-subscriber-online-state/update-subscriber-online-state.command';
import { UpdateSubscriberOnlineState } from './usecases/update-subscriber-online-state/update-subscriber-online-state.usecase';

@Controller('/internal')
@ApiExcludeController()
export class InternalController {
  constructor(private readonly updateSubscriberOnlineStateUsecase: UpdateSubscriberOnlineState) {}

  @Post('/subscriber-online-state')
  @UseGuards(AuthGuard('subscriberJwt'))
  @HttpCode(HttpStatus.OK)
  async updateSubscriberOnlineState(
    @Body() body: UpdateSubscriberOnlineStateRequestDto,
    @SubscriberSession() subscriberSession: SubscriberEntity
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
