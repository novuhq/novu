import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { IJwtPayload, MemberRoleEnum } from '@notifire/shared';
import { IntegrationEntity } from '@notifire/dal';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateIntegration } from './usecases/create-integration/create-integration.usecase';
import { CreateIntegrationBodyDto } from './dto/create-integration.dto';
import { CreateIntegrationCommand } from './usecases/create-integration/create-integration.command';
import { GetIntegration } from './usecases/get-integration/get-integration.usecase';
import { GetIntegrationCommand } from './usecases/get-integration/get-integration.command';
import { Roles } from '../auth/framework/roles.decorator';
import { UpdateIntegrationBodyDto } from './dto/update-integration.dto';
import { UpdateIntegration } from './usecases/update-integration/update-integration.usecase';
import { UpdateIntegrationCommand } from './usecases/update-integration/update-integration.command';

@Controller('/integrations')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(
    private getIntegrationUsecase: GetIntegration,
    private createIntegrationUsecase: CreateIntegration,
    private updateIntegrationUsecase: UpdateIntegration
  ) {}

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

  @Put('/:integrationId')
  @Roles(MemberRoleEnum.ADMIN)
  updateIntegrationById(
    @UserSession() user: IJwtPayload,
    @Param('integrationId') integrationId: string,
    @Body() body: UpdateIntegrationBodyDto
  ) {
    return this.updateIntegrationUsecase.execute(
      UpdateIntegrationCommand.create({
        applicationId: user.applicationId,
        organizationId: user.organizationId,
        integrationId,
        providerId: body.providerId,
        channel: body.channel,
        credentials: body.credentials,
        active: body.active,
      })
    );
  }
}
