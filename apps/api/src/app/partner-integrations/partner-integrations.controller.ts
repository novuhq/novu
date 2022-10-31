import {
  Controller,
  Post,
  Param,
  UseInterceptors,
  UseGuards,
  ClassSerializerInterceptor,
  Body,
  Get,
} from '@nestjs/common';
import { IJwtPayload } from '@novu/shared';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { UserSession } from '../shared/framework/user.decorator';
import { CompleteVercelIntegrationRequestDto } from './dtos/complete-vercel-integration-request.dto';
import { SetVercelConfigurationRequestDto } from './dtos/setup-vercel-integration-request.dto';
import { SetupVercelConfigurationResponseDto } from './dtos/setup-vercel-integration-response.dto';
import { CompleteVercelIntegrationCommand } from './usecases/complete-vercel-integration/complete-vercel-integration.command';
import { CompleteVercelIntegration } from './usecases/complete-vercel-integration/complete-vercel-integration.usecase';
import { GetVercelProjectsCommand } from './usecases/get-vercel-projects/get-vercel-projects.command';
import { GetVercelProjects } from './usecases/get-vercel-projects/get-vercel-projects.usecase';
import { SetVercelConfigurationCommand } from './usecases/set-vercel-configuration/set-vercel-configuration.command';
import { SetVercelConfiguration } from './usecases/set-vercel-configuration/set-vercel-configuration.usecase';

@Controller('/partner-integrations')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class PartnerIntegrationsController {
  constructor(
    private setVercelConfigurationUsecase: SetVercelConfiguration,
    private getVercelProjectsUsecase: GetVercelProjects,
    private completeVercelIntegrationUsecase: CompleteVercelIntegration
  ) {}

  @Post('/vercel')
  async setupVercelIntegration(
    @UserSession() user: IJwtPayload,
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

  @Get('/vercel/projects/:configurationId')
  async getVercelProjects(@UserSession() user: IJwtPayload, @Param('configurationId') configurationId: string) {
    return await this.getVercelProjectsUsecase.execute(
      GetVercelProjectsCommand.create({
        configurationId: configurationId,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Post('/vercel/complete')
  async completeVercelIntegration(@UserSession() user: IJwtPayload, @Body() body: CompleteVercelIntegrationRequestDto) {
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
}
