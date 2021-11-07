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
import { IJwtPayload } from '@notifire/shared';
import { ApplicationEntity } from '@notifire/dal';
import { AuthGuard } from '@nestjs/passport';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateApplication } from './usecases/create-application/create-application.usecase';
import { CreateApplicationCommand } from './usecases/create-application/create-application.command';
import { CreateApplicationBodyDto } from './dto/create-application.dto';
import { GetApiKeysCommand } from './usecases/get-api-keys/get-api-keys.command';
import { GetApiKeys } from './usecases/get-api-keys/get-api-keys.usecase';
import { GetApplication, GetApplicationCommand } from './usecases/get-application';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { UpdateBrandingDetails } from './usecases/update-branding-details/update-branding-details.usecase';
import { UpdateBrandingDetailsCommand } from './usecases/update-branding-details/update-branding-details.command';

@Controller('/applications')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(
    private createApplicationUsecase: CreateApplication,
    private getApiKeysUsecase: GetApiKeys,
    private getApplicationUsecase: GetApplication,
    private updateBrandingDetailsUsecase: UpdateBrandingDetails
  ) {}

  @Get('/me')
  async getCurrentApplication(@UserSession() user: IJwtPayload): Promise<ApplicationEntity> {
    return await this.getApplicationUsecase.execute(
      GetApplicationCommand.create({
        applicationId: user.applicationId,
        userId: user._id,
        organizationId: user.organizationId,
      })
    );
  }

  @Post('/')
  async createApplication(
    @UserSession() user: IJwtPayload,
    @Body() body: CreateApplicationBodyDto
  ): Promise<ApplicationEntity> {
    return await this.createApplicationUsecase.execute(
      CreateApplicationCommand.create({
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
        applicationId: user.applicationId,
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
      applicationId: user.applicationId,
    });

    return await this.getApiKeysUsecase.execute(command);
  }
}
