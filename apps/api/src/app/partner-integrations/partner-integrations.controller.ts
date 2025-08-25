import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateVercelIntegrationRequestDto } from './dtos/create-vercel-integration-request.dto';
import { CreateVercelIntegrationResponseDto } from './dtos/create-vercel-integration-response.dto';
import { UpdateVercelIntegrationRequestDto } from './dtos/update-vercel-integration-request.dto';
import { CreateVercelIntegrationCommand } from './usecases/create-vercel-integration/create-vercel-integration.command';
import { CreateVercelIntegration } from './usecases/create-vercel-integration/create-vercel-integration.usecase';
import { GetVercelIntegrationCommand } from './usecases/get-vercel-integration/get-vercel-integration.command';
import { GetVercelIntegration } from './usecases/get-vercel-integration/get-vercel-integration.usecase';
import { GetVercelIntegrationProjectsCommand } from './usecases/get-vercel-projects/get-vercel-integration-projects.command';
import { GetVercelIntegrationProjects } from './usecases/get-vercel-projects/get-vercel-integration-projects.usecase';
import { ProcessVercelWebhookCommand } from './usecases/process-vercel-webhook/process-vercel-webhook.command';
import { ProcessVercelWebhook } from './usecases/process-vercel-webhook/process-vercel-webhook.usecase';
import { UpdateVercelIntegrationCommand } from './usecases/update-vercel-integration/update-vercel-integration.command';
import { UpdateVercelIntegration } from './usecases/update-vercel-integration/update-vercel-integration.usecase';

@Controller('/partner-integrations')
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Partner Integrations')
@ApiExcludeController()
export class PartnerIntegrationsController {
  constructor(
    private createVercelIntegrationUsecase: CreateVercelIntegration,
    private getVercelIntegrationProjectsUsecase: GetVercelIntegrationProjects,
    private getVercelIntegrationUsecase: GetVercelIntegration,
    private updateVercelIntegrationUsecase: UpdateVercelIntegration,
    private processVercelWebhookUsecase: ProcessVercelWebhook
  ) {}

  @Post('/vercel')
  @RequireAuthentication()
  @RequirePermissions(PermissionsEnum.PARTNER_INTEGRATION_WRITE)
  async createVercelIntegration(
    @UserSession() user: UserSessionData,
    @Body() body: CreateVercelIntegrationRequestDto
  ): Promise<CreateVercelIntegrationResponseDto> {
    return await this.createVercelIntegrationUsecase.execute(
      CreateVercelIntegrationCommand.create({
        vercelIntegrationCode: body.vercelIntegrationCode,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        configurationId: body.configurationId,
      })
    );
  }

  @Put('/vercel')
  @RequireAuthentication()
  @RequirePermissions(PermissionsEnum.PARTNER_INTEGRATION_WRITE)
  async updateVercelIntegration(@UserSession() user: UserSessionData, @Body() body: UpdateVercelIntegrationRequestDto) {
    return await this.updateVercelIntegrationUsecase.execute(
      UpdateVercelIntegrationCommand.create({
        data: body.data,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        configurationId: body.configurationId,
      })
    );
  }

  @Get('/vercel/:configurationId')
  @RequireAuthentication()
  @RequirePermissions(PermissionsEnum.PARTNER_INTEGRATION_READ)
  async getVercelIntegration(@UserSession() user: UserSessionData, @Param('configurationId') configurationId: string) {
    return await this.getVercelIntegrationUsecase.execute(
      GetVercelIntegrationCommand.create({
        userId: user._id,
        configurationId,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
      })
    );
  }

  @Get('/vercel/:configurationId/projects')
  @RequireAuthentication()
  @RequirePermissions(PermissionsEnum.PARTNER_INTEGRATION_READ)
  async getVercelProjects(
    @UserSession() user: UserSessionData,
    @Param('configurationId') configurationId: string,
    @Query('nextPage') nextPage?: string
  ) {
    return await this.getVercelIntegrationProjectsUsecase.execute(
      GetVercelIntegrationProjectsCommand.create({
        configurationId,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        ...(nextPage && { nextPage }),
      })
    );
  }

  @Post('/vercel/webhook')
  async webhook(@Body() body: any, @Headers('x-vercel-signature') signatureHeader: string) {
    return this.processVercelWebhookUsecase.execute(
      ProcessVercelWebhookCommand.create({
        body,
        signatureHeader,
      })
    );
  }
}
