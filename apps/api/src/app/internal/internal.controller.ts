import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import {
  UpdateSubscriberOnlineStateRequestDto,
  UpdateSubscriberOnlineStateResponseDto,
} from './dtos/subscriber-online-state.dto';
import { UpdateSubscriberOnlineState } from './usecases/update-subscriber-online-state/update-subscriber-online-state.usecase';
import { UpdateSubscriberOnlineStateCommand } from './usecases/update-subscriber-online-state/update-subscriber-online-state.command';

@Controller('/internal')
@ApiExcludeController()
export class InternalController {
  constructor(private readonly updateSubscriberOnlineStateUsecase: UpdateSubscriberOnlineState) {}

  @Post('/subscriber-online-state')
  @UseGuards(AuthGuard('subscriberJwt'))
  @HttpCode(HttpStatus.OK)
  async updateSubscriberOnlineState(
    @Body() body: UpdateSubscriberOnlineStateRequestDto
  ): Promise<UpdateSubscriberOnlineStateResponseDto> {
    const command = UpdateSubscriberOnlineStateCommand.create({
      subscriberId: body.subscriberId,
      environmentId: body.environmentId,
      isOnline: body.isOnline,
      timestamp: body.timestamp ?? Date.now(),
    });

    return await this.updateSubscriberOnlineStateUsecase.execute(command);
  }
}
