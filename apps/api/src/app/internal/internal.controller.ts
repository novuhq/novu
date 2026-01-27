import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiExcludeController } from '@nestjs/swagger';
import { SubscriberSession } from '../shared/framework/user.decorator';
import { SchedulerCallbackRequestDto, SchedulerCallbackResponseDto } from './dtos/scheduler-callback.dto';
import {
  UpdateSubscriberOnlineStateRequestDto,
  UpdateSubscriberOnlineStateResponseDto,
} from './dtos/subscriber-online-state.dto';
import { InternalCallbackGuard } from './guards/internal-callback.guard';
import { HandleSchedulerCallbackCommand } from './usecases/handle-scheduler-callback/handle-scheduler-callback.command';
import { HandleSchedulerCallback } from './usecases/handle-scheduler-callback/handle-scheduler-callback.usecase';
import { UpdateSubscriberOnlineStateCommand } from './usecases/update-subscriber-online-state/update-subscriber-online-state.command';
import { UpdateSubscriberOnlineState } from './usecases/update-subscriber-online-state/update-subscriber-online-state.usecase';

@Controller('/internal')
@ApiExcludeController()
export class InternalController {
  constructor(
    private readonly updateSubscriberOnlineStateUsecase: UpdateSubscriberOnlineState,
    private readonly handleSchedulerCallbackUsecase: HandleSchedulerCallback
  ) {}

  @Post('/subscriber-online-state')
  @UseGuards(AuthGuard('subscriberJwt'))
  @HttpCode(HttpStatus.OK)
  async updateSubscriberOnlineState(
    @Body() body: UpdateSubscriberOnlineStateRequestDto,
    @SubscriberSession() subscriberSession: SubscriberSession
  ): Promise<UpdateSubscriberOnlineStateResponseDto> {
    const command = UpdateSubscriberOnlineStateCommand.create({
      subscriberId: subscriberSession.subscriberId,
      environmentId: subscriberSession._environmentId,
      isOnline: body.isOnline,
      timestamp: body.timestamp ?? Date.now(),
    });

    return await this.updateSubscriberOnlineStateUsecase.execute(command);
  }

  @Post('/scheduler/callback')
  @UseGuards(InternalCallbackGuard)
  @HttpCode(HttpStatus.OK)
  async handleSchedulerCallback(@Body() body: SchedulerCallbackRequestDto): Promise<SchedulerCallbackResponseDto> {
    const command = HandleSchedulerCallbackCommand.create({
      jobId: body.jobId,
      mode: body.mode,
      data: body.data,
    });

    return await this.handleSchedulerCallbackUsecase.execute(command);
  }
}
