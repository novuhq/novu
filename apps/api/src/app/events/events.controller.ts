import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { IJwtPayload } from '@novu/shared';
import { v4 as uuidv4 } from 'uuid';
import { TriggerEvent, TriggerEventCommand } from './usecases/trigger-event';
import { UserSession } from '../shared/framework/user.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ISubscribersDefine } from '@novu/node';
import { CancelDigest } from './usecases/cancel-digest/cancel-digest.usecase';
import { CancelDigestCommand } from './usecases/cancel-digest/cancel-digest.command';
import { TriggerEventToAllCommand } from './usecases/trigger-event-to-all/trigger-event-to-all.command';
import { TriggerEventToAll } from './usecases/trigger-event-to-all/trigger-event-to-all.usecase';
import { TriggerEventRequestDto, TriggerEventResponseDto, TriggerEventToAllRequestDto } from './dtos';
import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('events')
@ApiTags('Event')
export class EventsController {
  constructor(
    private triggerEvent: TriggerEvent,
    private cancelDigestUsecase: CancelDigest,
    private triggerEventToAll: TriggerEventToAll
  ) {}

  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @Post('/trigger')
  @ApiOkResponse({
    type: TriggerEventResponseDto,
    content: {
      '200': {
        example: {
          acknowledged: true,
          status: 'processed',
          transactionId: 'd2239acb-e879-4bdb-ab6f-365b43278d8f',
        },
      },
    },
  })
  @ApiOperation({
    description: 'Trigger event to send notifications to subscribers',
  })
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
  @ApiOkResponse({
    type: TriggerEventResponseDto,
    content: {
      '200': {
        example: {
          acknowledged: true,
          status: 'processed',
          transactionId: 'd2239acb-e879-4bdb-ab6f-365b43278d8f',
        },
      },
    },
  })
  @ApiOperation({
    description: 'Trigger event to send notifications to all subscribers',
  })
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
  @ApiOkResponse({
    type: Boolean,
  })
  @ApiOperation({
    description: 'Cancel trigger with workflow containing running digest node',
  })
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
