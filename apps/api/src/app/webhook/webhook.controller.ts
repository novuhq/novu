import { ApiCommonResponses } from '../shared/framework/response.decorator';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
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
import { ApiRateLimitCategoryEnum, ApiRateLimitCostEnum } from '@novu/shared';
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
    private updateWebhook: UpdateWebhook
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
    `,
  })
  async triggerWebhook(@Param('webhookId') webhookId: string): Promise<string> {
    // Get webhook

    // Pass webhook to trigger event

    return 'TODO';
  }
}
