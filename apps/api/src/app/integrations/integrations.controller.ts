import { Body, ClassSerializerInterceptor, Controller, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { IJwtPayload } from '@notifire/shared';
import { IntegrationEntity } from '@notifire/dal';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateApplication } from './usecases/create-integration/create-integration.usecase';
import { CreateIntegrationBodyDto } from './dto/create-integration.dto';
import { CreateIntegrationCommand } from './usecases/create-integration/create-integration.command';

@Controller('/integrations')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(private createApplicationUsecase: CreateApplication) {}

  @Post('/')
  async createApplication(
    @UserSession() user: IJwtPayload,
    @Body() body: CreateIntegrationBodyDto
  ): Promise<IntegrationEntity> {
    return await this.createApplicationUsecase.execute(
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
