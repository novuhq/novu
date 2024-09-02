import { ApiExcludeController, ApiTags } from '@nestjs/swagger';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseInterceptors,
  Headers,
} from '@nestjs/common';
import { UserSessionData } from '@novu/shared';
import { ModuleRef } from '@nestjs/core';
import { UserSession } from '../shared/framework/user.decorator';
import { CompleteAndUpdateVercelIntegrationRequestDto } from './dtos/complete-and-update-vercel-integration-request.dto';
import { SetVercelConfigurationRequestDto } from './dtos/setup-vercel-integration-request.dto';
import { SetupVercelConfigurationResponseDto } from './dtos/setup-vercel-integration-response.dto';
import { CompleteVercelIntegrationCommand } from './usecases/complete-vercel-integration/complete-vercel-integration.command';
import { CompleteVercelIntegration } from './usecases/complete-vercel-integration/complete-vercel-integration.usecase';
import { GetVercelConfigurationCommand } from './usecases/get-vercel-configuration/get-vercel-configuration.command';
import { GetVercelConfiguration } from './usecases/get-vercel-configuration/get-vercel-configuration.usecase';
import { GetVercelProjectsCommand } from './usecases/get-vercel-projects/get-vercel-projects.command';
import { GetVercelProjects } from './usecases/get-vercel-projects/get-vercel-projects.usecase';
import { SetVercelConfigurationCommand } from './usecases/set-vercel-configuration/set-vercel-configuration.command';
import { SetVercelConfiguration } from './usecases/set-vercel-configuration/set-vercel-configuration.usecase';
import { UpdateVercelConfigurationCommand } from './usecases/update-vercel-configuration/update-vercel-configuration.command';
import { UpdateVercelConfiguration } from './usecases/update-vercel-configuration/update-vercel-configuration.usecase';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { ProcessVercelWebhook } from './usecases/process-vercel-webhook/process-vercel-webhook.usecase';
import { ProcessVercelWebhookCommand } from './usecases/process-vercel-webhook/process-vercel-webhook.command';

@Controller('/partner-integrations')
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Partner Integrations')
@ApiExcludeController()
export class PartnerIntegrationsController {
  constructor(
    private setVercelConfigurationUsecase: SetVercelConfiguration,
    private getVercelProjectsUsecase: GetVercelProjects,
    private completeVercelIntegrationUsecase: CompleteVercelIntegration,
    private getVercelConfigurationUsecase: GetVercelConfiguration,
    private updateVercelConfigurationUsecase: UpdateVercelConfiguration,
    private processVercelWebhookUsecase: ProcessVercelWebhook,
    protected moduleRef: ModuleRef
  ) {}

  @Post('/vercel')
  @UserAuthentication()
  async setupVercelIntegration(
    @UserSession() user: UserSessionData,
    @Body() body: SetVercelConfigurationRequestDto
  ): Promise<SetupVercelConfigurationResponseDto> {
    return await this.setVercelConfigurationUsecase.execute(
      SetVercelConfigurationCommand.create({
        vercelIntegrationCode: body.vercelIntegrationCode,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        configurationId: body.configurationId,
      })
    );
  }

  @Post('/vercel/webhook')
  async webhook(@Body() body: any, @Headers('x-vercel-signature') signatureHeader: string) {
    return this.processVercelWebhookUsecase.execute(
      ProcessVercelWebhookCommand.create({
        body,
        teamId: body.payload.team.id,
        projectId: body.payload.project.id,
        deploymentUrl: body.payload.deployment.url,
        vercelEnvironment: body.payload.target || 'preview',
        signatureHeader,
      })
    );
  }

  @Get('/vercel/projects/:configurationId')
  @UserAuthentication()
  async getVercelProjects(
    @UserSession() user: UserSessionData,
    @Param('configurationId') configurationId: string,
    @Query('nextPage') nextPage?: string
  ) {
    return await this.getVercelProjectsUsecase.execute(
      GetVercelProjectsCommand.create({
        configurationId,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        ...(nextPage && { nextPage }),
      })
    );
  }

  @Post('/vercel/configuration/complete')
  @UserAuthentication()
  async completeVercelIntegration(
    @UserSession() user: UserSessionData,
    @Body() body: CompleteAndUpdateVercelIntegrationRequestDto
  ) {
    return await this.completeVercelIntegrationUsecase.execute(
      CompleteVercelIntegrationCommand.create({
        data: body.data,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        configurationId: body.configurationId,
      })
    );
  }

  @Get('vercel/configuration/:configurationId')
  @UserAuthentication()
  async getVercelConfigurationDetails(
    @UserSession() user: UserSessionData,
    @Param('configurationId') configurationId: string
  ) {
    return await this.getVercelConfigurationUsecase.execute(
      GetVercelConfigurationCommand.create({
        userId: user._id,
        configurationId,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
      })
    );
  }

  @Put('/vercel/configuration/update')
  @UserAuthentication()
  async updateVercelConfiguration(
    @UserSession() user: UserSessionData,
    @Body() body: CompleteAndUpdateVercelIntegrationRequestDto
  ) {
    return await this.updateVercelConfigurationUsecase.execute(
      UpdateVercelConfigurationCommand.create({
        data: body.data,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        configurationId: body.configurationId,
      })
    );
  }
}
