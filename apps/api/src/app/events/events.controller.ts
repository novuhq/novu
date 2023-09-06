import { Body, Controller, Delete, Param, Post, Scope, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import {
  IJwtPayload,
  ISubscribersDefine,
  ITenantDefine,
  TriggerRecipientSubscriber,
  TriggerTenantContext,
} from '@novu/shared';
import { MapTriggerRecipients, SendTestEmail, SendTestEmailCommand } from '@novu/application-generic';

import {
  BulkTriggerEventDto,
  TestSendEmailRequestDto,
  TriggerEventRequestDto,
  TriggerEventResponseDto,
  TriggerEventToAllRequestDto,
} from './dtos';
import { CancelDelayed, CancelDelayedCommand } from './usecases/cancel-delayed';
import { ParseEventRequest, ParseEventRequestCommand } from './usecases/parse-event-request';
import { ProcessBulkTrigger, ProcessBulkTriggerCommand } from './usecases/process-bulk-trigger';
import { TriggerEventToAll, TriggerEventToAllCommand } from './usecases/trigger-event-to-all';

import { UserSession } from '../shared/framework/user.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ApiResponse } from '../shared/framework/response.decorator';
import { DataBooleanDto } from '../shared/dtos/data-wrapper-dto';

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
    private parseEventRequest: ParseEventRequest,
    private processBulkTriggerUsecase: ProcessBulkTrigger
  ) {}

  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @Post('/trigger')
  @ApiResponse(TriggerEventResponseDto, 201)
  @ApiOperation({
    summary: 'Trigger event',
    description: `
    Trigger event is the main (and only) way to send notifications to subscribers. 
    The trigger identifier is used to match the particular workflow associated with it. 
    Additional information can be passed according the body interface below.
    `,
  })
  async trackEvent(
    @UserSession() user: IJwtPayload,
    @Body() body: TriggerEventRequestDto
  ): Promise<TriggerEventResponseDto> {
    const mappedTenant = body.tenant ? this.mapTenant(body.tenant) : null;

    const result = await this.parseEventRequest.execute(
      ParseEventRequestCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier: body.name,
        payload: body.payload || {},
        overrides: body.overrides || {},
        to: body.to,
        actor: body.actor,
        tenant: mappedTenant,
        transactionId: body.transactionId,
      })
    );

    return result as unknown as TriggerEventResponseDto;
  }

  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @Post('/trigger/bulk')
  @ApiResponse(TriggerEventResponseDto, 201, true)
  @ApiOperation({
    summary: 'Bulk trigger event',
    description: `
      Using this endpoint you can trigger multiple events at once, to avoid multiple calls to the API.
      The bulk API is limited to 100 events per request.
    `,
  })
  async triggerBulkEvents(
    @UserSession() user: IJwtPayload,
    @Body() body: BulkTriggerEventDto
  ): Promise<TriggerEventResponseDto[]> {
    return this.processBulkTriggerUsecase.execute(
      ProcessBulkTriggerCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        events: body.events,
      })
    );
  }

  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @Post('/trigger/broadcast')
  @ApiResponse(TriggerEventResponseDto)
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
    const mappedTenant = body.tenant ? this.mapTenant(body.tenant) : null;

    return this.triggerEventToAll.execute(
      TriggerEventToAllCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier: body.name,
        payload: body.payload,
        tenant: mappedTenant,
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
      SendTestEmailCommand.create({
        subject: body.subject,
        payload: body.payload,
        contentType: body.contentType,
        content: body.content,
        preheader: body.preheader,
        layoutId: body.layoutId,
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
    type: DataBooleanDto,
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

  private mapTenant(tenant?: TriggerTenantContext | null): ITenantDefine | null {
    if (!tenant) return null;

    return this.parseEventRequest.mapTenant(tenant);
  }
}
