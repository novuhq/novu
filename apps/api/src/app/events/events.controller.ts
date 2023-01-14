import { IJwtPayload } from '@novu/shared';
import { ISubscribersDefine, TriggerRecipientSubscriber } from '@novu/node';
import { Body, Controller, Delete, Param, Post, Scope, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiExcludeEndpoint, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';

import {
  TestSendEmailRequestDto,
  TriggerEventRequestDto,
  TriggerEventResponseDto,
  TriggerEventToAllRequestDto,
} from './dtos';
import { CancelDelayed } from './usecases/cancel-delayed/cancel-delayed.usecase';
import { CancelDelayedCommand } from './usecases/cancel-delayed/cancel-delayed.command';
import { TriggerEventToAllCommand } from './usecases/trigger-event-to-all/trigger-event-to-all.command';
import { TriggerEventToAll } from './usecases/trigger-event-to-all/trigger-event-to-all.usecase';
import { SendTestEmail } from './usecases/send-message/test-send-email.usecase';
import { TestSendMessageCommand } from './usecases/send-message/send-message.command';
import { MapTriggerRecipients, MapTriggerRecipientsCommand } from './usecases/map-trigger-recipients';

import { UserSession } from '../shared/framework/user.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ParseEventRequest } from './usecases/parse-event-request/parse-event-request.usecase';
import { ParseEventRequestCommand } from './usecases/parse-event-request/parse-event-request.command';

@Controller({
  path: 'events',
  scope: Scope.REQUEST,
})
@ApiTags('Events')
export class EventsController {
  constructor(
    private mapTriggerRecipients: MapTriggerRecipients,
    private cancelDelayedUsecase: CancelDelayed,
    private triggerEventToAll: TriggerEventToAll,
    private sendTestEmail: SendTestEmail,
    private parseEventRequest: ParseEventRequest
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
    Additional information can be passed according the body interface below.
    `,
  })
  async trackEvent(
    @UserSession() user: IJwtPayload,
    @Body() body: TriggerEventRequestDto
  ): Promise<TriggerEventResponseDto> {
    const transactionId = body.transactionId || uuidv4();

    const { _id: userId, environmentId, organizationId } = user;

    const mappedActor = this.mapActor(body.actor);
    const mapTriggerRecipientsCommand = MapTriggerRecipientsCommand.create({
      environmentId,
      organizationId,
      recipients: body.to,
      transactionId,
      userId,
    });
    const mappedTo = await this.mapTriggerRecipients.execute(mapTriggerRecipientsCommand);

    const result = await this.parseEventRequest.execute(
      ParseEventRequestCommand.create({
        userId,
        environmentId,
        organizationId,
        identifier: body.name,
        payload: body.payload,
        overrides: body.overrides || {},
        to: mappedTo,
        actor: mappedActor,
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
    const mappedActor = body.actor ? this.mapActor(body.actor) : null;

    return this.triggerEventToAll.execute(
      TriggerEventToAllCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier: body.name,
        payload: body.payload,
        transactionId,
        overrides: body.overrides || {},
        actor: mappedActor,
      })
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('/test/email')
  @ApiExcludeEndpoint()
  async testEmailMessage(@UserSession() user: IJwtPayload, @Body() body: TestSendEmailRequestDto): Promise<void> {
    return await this.sendTestEmail.execute(
      TestSendMessageCommand.create({
        subject: body.subject,
        payload: body.payload,
        contentType: body.contentType,
        content: body.content,
        preheader: body.preheader,
        to: body.to,
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
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

  private mapActor(actor?: TriggerRecipientSubscriber | null): ISubscribersDefine | null {
    if (!actor) return null;

    return this.mapTriggerRecipients.mapSubscriber(actor);
  }
}
