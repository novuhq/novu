import { ApiCommonResponses } from '../shared/framework/response.decorator';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Scope,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserAuthGuard } from '@novu/application-generic';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThrottlerCategory, ThrottlerCost } from '../rate-limiting/guards';
import {
  AddressingTypeEnum,
  ApiRateLimitCategoryEnum,
  ApiRateLimitCostEnum,
  TriggerRequestCategoryEnum,
} from '@novu/shared';
import { GetWebhook } from './usecases/get-webhook.usecase';
import {
  CreateWebhookCommand,
  ICreateWebhookBody,
  IUpdateWebhookBody,
  ListWebhookCommand,
  SpecificWebhookCommand,
  UpdateWebhookCommand,
} from './dtos/webhook-request.dto';
import { ListWebhook } from './usecases/list-webhook.usecase';
import { RegenWebhook } from './usecases/regen-webhook.usecase';
import { CreateWebhook } from './usecases/create-webhook.usecase';
import { UpdateWebhook } from './usecases/update-webhook.usecase';
import { WebhookResponseDto } from './dtos/webhook-responce.dto';
import { ParseEventRequest, ParseEventRequestMulticastCommand } from '../events/usecases/parse-event-request';
import { TriggerEventResponseDto } from '../events/dtos';
import { NotificationTemplateRepository } from '@novu/dal/src';

@ThrottlerCategory(ApiRateLimitCategoryEnum.TRIGGER)
@ApiCommonResponses()
@Controller({
  path: '',
  scope: Scope.REQUEST,
})
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Webhook')
export class WorkflowController {
  constructor(
    private getWebhook: GetWebhook,
    private listWebhooks: ListWebhook,
    private regenWebhook: RegenWebhook,
    private createWebhook: CreateWebhook,
    private updateWebhook: UpdateWebhook,
    // from event controller
    private parseEventRequest: ParseEventRequest,
    private notificationTemplateRepository: NotificationTemplateRepository
  ) {}

  @Get('environments/:envId/webhooks')
  @UseGuards(UserAuthGuard)
  @ApiOperation({
    summary: 'Get all webhooks per an environment',
    description: `
      Using this endpoint you can list all webhooks for an environment.
    `,
  })
  async listWebhooksMethod(
    @Param('envId') environmentId: string,
    @Query('notificationTemplateId') notificationTemplateId: string | null
  ): Promise<WebhookResponseDto[]> {
    return await this.listWebhooks.execute(
      ListWebhookCommand.create({
        environmentId: environmentId,
        notificationTemplateId,
      })
    );
  }

  @Get('/webhook/:webhookId')
  @UseGuards(UserAuthGuard)
  @ApiOperation({
    summary: 'Get a specific webhook event',
    description: `
      Using this endpoint you can trigger an event without having to set up the Novu SDK.
    `,
  })
  async getWebhookMethod(@Param('webhookId') webhookId: string): Promise<WebhookResponseDto | null> {
    return await this.getWebhook.execute(
      SpecificWebhookCommand.create({
        webhookId: webhookId,
      })
    );
  }

  @Post('/webhook')
  @ApiOperation({
    summary: 'Create new webhooks',
    description: `
      Using this endpoint you can create a new webhook for a workflow.
      ID is guaranteed to be unique over all organizations and environments.
    `,
  })
  async createWebhookMethod(@Body() body: ICreateWebhookBody) {
    // TODO add variable validation

    await this.createWebhook.execute(
      CreateWebhookCommand.create({
        webhookId: body.webhookId,

        environmentId: body.environmentId,

        organizationId: body.organizationId,

        templateId: body.templateId,

        name: body.name,

        description: body.description,

        active: body.active,

        subscribers: body.subscribers,

        variables: body.variables,
      })
    );
  }

  @Put('/webhook/:webhookId')
  @ApiOperation({
    summary: 'Update a specific webhook',
    description: `
      Using this endpoint you can trigger an event without having to set up the Novu SDK.
    `,
  })
  async updateWebhookMethod(@Body() body: IUpdateWebhookBody): Promise<WebhookResponseDto | null> {
    await this.updateWebhook.execute(
      UpdateWebhookCommand.create({
        webhookId: body.webhookId,
        name: body.name,
        description: body.description,
        active: body.active,
        variables: body.variables,
      })
    );

    // TODO add variable validation

    return await this.getWebhook.execute(
      SpecificWebhookCommand.create({
        webhookId: body.webhookId,
      })
    );
  }

  @Patch('/webhook/:webhookId')
  @ApiOperation({
    summary: 'Regenerates the specified webhooks token that is used in the web identifies the webhook.',
    description: `
      Using this endpoint you can trigger an event without having to set up the Novu SDK.
    `,
  })
  async regenWebhookMethod(@Param('webhookId') webhookId: string): Promise<WebhookResponseDto | null> {
    await this.regenWebhook.execute(
      SpecificWebhookCommand.create({
        webhookId: webhookId,
      })
    );

    return await this.getWebhook.execute(
      SpecificWebhookCommand.create({
        webhookId: webhookId,
      })
    );
  }

  @Post('/event/trigger/:webhookId')
  @ThrottlerCost(ApiRateLimitCostEnum.SINGLE)
  @ApiOperation({
    summary: 'webhook trigger event',
    description: `
      Using this endpoint you can trigger an event without having to set up the Novu SDK.
      Note: Idempotency is not guaranteed on this endpoint 
      and if Idempotency is a concern then it is highly advised to use the SDK.
    `,
  })
  async triggerWebhook(@Param('webhookId') webhookId: string): Promise<TriggerEventResponseDto> {
    // Get webhook
    const webhook = await this.getWebhook.execute(
      SpecificWebhookCommand.create({
        webhookId: webhookId,
      })
    );

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    // Get notification template
    const template = await this.notificationTemplateRepository.findById(webhook.templateId, webhook.environmentId);

    if (!template) {
      throw new NotFoundException('Workflow not found');
    }

    // Pass webhook to trigger event
    const result = await this.parseEventRequest.execute(
      ParseEventRequestMulticastCommand.create({
        /*
         * This say the specific webhook that is being called
         * can enhance with headers if users want more details and tracing
         */
        userId: 'webhook-' + webhook.name,
        environmentId: webhook.environmentId,
        organizationId: webhook.organizationId,
        identifier: template.triggers[0].identifier,
        payload: webhook.variables || {},
        overrides: {},
        to: webhook.subscribers,
        /*
         *  Maybe actor this should be webhook name
         * actor: body.actor,
         * tenant: body.tenant,
         * transactionId: body.transactionId,
         */
        addressingType: AddressingTypeEnum.MULTICAST,
        requestCategory: TriggerRequestCategoryEnum.SINGLE,
      })
    );

    return result as unknown as TriggerEventResponseDto;
  }
}
