import { Body, ClassSerializerInterceptor, Controller, Get, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { IJwtPayload } from '@notifire/shared';
import { IntegrationEntity } from '@notifire/dal';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateIntegration } from './usecases/create-integration/create-integration.usecase';
import { CreateIntegrationBodyDto } from './dto/create-integration.dto';
import { CreateIntegrationCommand } from './usecases/create-integration/create-integration.command';
import { GetIntegration } from './usecases/get-integration/get-integration.usecase';
import { GetIntegrationCommand } from './usecases/get-integration/get-integration.command';

@Controller('/integrations')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(private getIntegrationUsecase: GetIntegration, private createIntegrationUsecase: CreateIntegration) {}

  @Get('/')
  async getIntegrations(@UserSession() user: IJwtPayload): Promise<IntegrationEntity[]> {
    return await this.getIntegrationUsecase.execute(
      GetIntegrationCommand.create({ applicationId: user.applicationId, organizationId: user.organizationId })
    );
  }

  @Post('/')
  async createIntegration(
    @UserSession() user: IJwtPayload,
    @Body() body: CreateIntegrationBodyDto
  ): Promise<IntegrationEntity> {
    return await this.createIntegrationUsecase.execute(
      CreateIntegrationCommand.create({
        applicationId: user.applicationId,
        organizationId: user.organizationId,
        providerId: body.providerId,
        channel: body.channel,
        credentials: body.credentials,
        active: body.active,
      })
    );
  }
}
