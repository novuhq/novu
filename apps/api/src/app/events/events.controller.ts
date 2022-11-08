import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { IJwtPayload } from '@novu/shared';
import { v4 as uuidv4 } from 'uuid';
import { TriggerEvent, TriggerEventCommand } from './usecases/trigger-event';
import { UserSession } from '../shared/framework/user.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ISubscribersDefine } from '@novu/node';
import { CancelDelayed } from './usecases/cancel-delayed/cancel-delayed.usecase';
import { CancelDelayedCommand } from './usecases/cancel-delayed/cancel-delayed.command';
import { TriggerEventToAllCommand } from './usecases/trigger-event-to-all/trigger-event-to-all.command';
import { TriggerEventToAll } from './usecases/trigger-event-to-all/trigger-event-to-all.usecase';
import { TriggerEventRequestDto, TriggerEventResponseDto, TriggerEventToAllRequestDto } from './dtos';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('events')
@ApiTags('Events')
export class EventsController {
  constructor(
    private triggerEvent: TriggerEvent,
    private cancelDelayedUsecase: CancelDelayed,
    private triggerEventToAll: TriggerEventToAll
  ) {}

  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @Post('/trigger')
  @ApiCreatedResponse({
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
    summary: 'Trigger event',
    description: `
    Trigger event is the main (and the only) way to send notification to subscribers. 
    The trigger identifier is used to match the particular template associated with it. 
    Additional information can be passed according the the body interface below.
    `,
  })
  async trackEvent(
    @UserSession() user: IJwtPayload,
    @Body() body: TriggerEventRequestDto
  ): Promise<TriggerEventResponseDto> {
    const mappedSubscribers = this.mapSubscribers(body);
    const transactionId = body.transactionId || uuidv4();

    await this.triggerEvent.validateTransactionIdProperty(transactionId, user.organizationId, user.environmentId);

    const result = await this.triggerEvent.execute(
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

    return result as unknown as TriggerEventResponseDto;
  }

  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @Post('/trigger/broadcast')
  @ApiCreatedResponse({
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
    summary: 'Broadcast event to all',
    description: `Trigger a broadcast event to all existing subscribers, could be used to send announcements, etc.
      In the future could be used to trigger events to a subset of subscribers based on defined filters.`,
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
    summary: 'Cancel triggered event',
    description: `
    Using a previously generated transactionId during the event trigger,
     will cancel any active or pending workflows. This is useful to cancel active digests, delays etc...
    `,
  })
  async cancelDelayed(
    @UserSession() user: IJwtPayload,
    @Param('transactionId') transactionId: string
  ): Promise<boolean> {
    return await this.cancelDelayedUsecase.execute(
      CancelDelayedCommand.create({
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
