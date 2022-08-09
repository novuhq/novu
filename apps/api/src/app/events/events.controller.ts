import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import {
  IJwtPayload,
  TriggerEventRequestDto,
  TriggerEventResponseDto,
  TriggerEventToAllRequestDto,
} from '@novu/shared';
import { v4 as uuidv4 } from 'uuid';
import { TriggerEvent, TriggerEventCommand } from './usecases/trigger-event';
import { UserSession } from '../shared/framework/user.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ISubscribersDefine } from '@novu/shared';
import { CancelDigest } from './usecases/cancel-digest/cancel-digest.usecase';
import { CancelDigestCommand } from './usecases/cancel-digest/cancel-digest.command';
import { TriggerEventToAllCommand } from './usecases/trigger-event-to-all/trigger-event-to-all.command';
import { TriggerEventToAll } from './usecases/trigger-event-to-all/trigger-event-to-all.usecase';

@Controller('events')
export class EventsController {
  constructor(
    private triggerEvent: TriggerEvent,
    private cancelDigestUsecase: CancelDigest,
    private triggerEventToAll: TriggerEventToAll
  ) {}

  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @Post('/trigger')
  async trackEvent(
    @UserSession() user: IJwtPayload,
    @Body() body: TriggerEventRequestDto
  ): Promise<TriggerEventResponseDto | string> {
    const mappedSubscribers = this.mapSubscribers(body);
    const transactionId = body.transactionId || uuidv4();

    await this.triggerEvent.validateTransactionIdProperty(transactionId, user.organizationId, user.environmentId);

    return this.triggerEvent.execute(
      TriggerEventCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier: body.name,
        payload: body.payload,
        overrides: body.overrides || {},
        to: mappedSubscribers,
        transactionId,
      })
    );
  }

  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @Post('/trigger/broadcast')
  async trackEventToAll(
    @UserSession() user: IJwtPayload,
    @Body() body: TriggerEventToAllRequestDto
  ): Promise<TriggerEventResponseDto> {
    const transactionId = body.transactionId || uuidv4();
    await this.triggerEvent.validateTransactionIdProperty(transactionId, user.organizationId, user.environmentId);

    return this.triggerEventToAll.execute(
      TriggerEventToAllCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier: body.name,
        payload: body.payload,
        transactionId,
        overrides: body.overrides || {},
      })
    );
  }

  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @Delete('/trigger/:transactionId')
  async cancelDigest(
    @UserSession() user: IJwtPayload,
    @Param('transactionId') transactionId: string
  ): Promise<boolean> {
    return await this.cancelDigestUsecase.execute(
      CancelDigestCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        transactionId,
      })
    );
  }

  private mapSubscribers(body: TriggerEventRequestDto): ISubscribersDefine[] {
    const subscribers = Array.isArray(body.to) ? body.to : [body.to];

    return subscribers.map((subscriber) => {
      if (typeof subscriber === 'string') {
        return {
          subscriberId: subscriber,
        };
      } else {
        return subscriber;
      }
    });
  }
}
