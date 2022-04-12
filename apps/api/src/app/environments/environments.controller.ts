import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { IJwtPayload } from '@novu/shared';
import { EnvironmentEntity } from '@novu/dal';
import { AuthGuard } from '@nestjs/passport';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateEnvironment } from './usecases/create-environment/create-environment.usecase';
import { CreateEnvironmentCommand } from './usecases/create-environment/create-environment.command';
import { CreateEnvironmentBodyDto } from './dto/create-environment.dto';
import { GetApiKeysCommand } from './usecases/get-api-keys/get-api-keys.command';
import { GetApiKeys } from './usecases/get-api-keys/get-api-keys.usecase';
import { GetEnvironment, GetEnvironmentCommand } from './usecases/get-environment';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { UpdateBrandingDetails } from './usecases/update-branding-details/update-branding-details.usecase';
import { UpdateBrandingDetailsCommand } from './usecases/update-branding-details/update-branding-details.command';

@Controller('/environments')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class EnvironmentsController {
  constructor(
    private createEnvironmentUsecase: CreateEnvironment,
    private getApiKeysUsecase: GetApiKeys,
    private getEnvironmentUsecase: GetEnvironment,
    private updateBrandingDetailsUsecase: UpdateBrandingDetails
  ) {}

  @Get('/me')
  async getCurrentEnvironment(@UserSession() user: IJwtPayload): Promise<EnvironmentEntity> {
    return await this.getEnvironmentUsecase.execute(
      GetEnvironmentCommand.create({
        environmentId: user.environmentId,
        userId: user._id,
        organizationId: user.organizationId,
      })
    );
  }

  @Post('/')
  async createEnvironment(
    @UserSession() user: IJwtPayload,
    @Body() body: CreateEnvironmentBodyDto
  ): Promise<EnvironmentEntity> {
    return await this.createEnvironmentUsecase.execute(
      CreateEnvironmentCommand.create({
        name: body.name,
        userId: user._id,
        organizationId: user.organizationId,
      })
    );
  }

  @Put('/branding')
  async updateBrandingDetails(
    @UserSession() user: IJwtPayload,
    @Body() body: { color: string; logo: string; fontColor: string; contentBackground: string; fontFamily: string }
  ) {
    return await this.updateBrandingDetailsUsecase.execute(
      UpdateBrandingDetailsCommand.create({
        logo: body.logo,
        color: body.color,
        environmentId: user.environmentId,
        userId: user._id,
        organizationId: user.organizationId,
        fontColor: body.fontColor,
        fontFamily: body.fontFamily,
        contentBackground: body.contentBackground,
      })
    );
  }

  @Get('/api-keys')
  async getOrganizationApiKeys(@UserSession() user: IJwtPayload) {
    const command = GetApiKeysCommand.create({
      userId: user._id,
      organizationId: user.organizationId,
      environmentId: user.environmentId,
    });

    return await this.getApiKeysUsecase.execute(command);
  }
}
