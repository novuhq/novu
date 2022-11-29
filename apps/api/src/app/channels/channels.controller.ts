import { Body, ClassSerializerInterceptor, Controller, Put, UseGuards, UseInterceptors } from '@nestjs/common';
import { IJwtPayload, MemberRoleEnum } from '@novu/shared';
import { UserSession } from '../shared/framework/user.decorator';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { Roles } from '../auth/framework/roles.decorator';
import { UpdateMailSettings } from './usecases/update-mail-settings/update-mail-settings.usecase';
import { UpdateMailSettingsCommand } from './usecases/update-mail-settings/update-mail-settings.command';
import { UpdateSmsSettings } from './usecases/update-sms-settings/update-sms-settings.usecase';
import { UpdateSmsSettingsCommand } from './usecases/update-sms-settings/update-sms-settings.command';
import { ApiExcludeController, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateMailSettingsRequestDto } from './dtos/update-mail-settings-request.dto';
import { UpdateSmsSettingsRequestDto } from './dtos/update-sms-settings-request.dto';
import { UpdateSettingsResponseDto } from './dtos/update-settings-response.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';

@Controller('/channels')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiTags('Channels')
@ApiExcludeController()
export class ChannelsController {
  constructor(
    private updateMailSettingsUsecase: UpdateMailSettings,
    private updateSmsSettingsUsecase: UpdateSmsSettings
  ) {}

  @Put('/email/settings')
  @Roles(MemberRoleEnum.ADMIN)
  @ApiOperation({
    summary: 'Update mail settings',
  })
  @ApiOkResponse({
    type: UpdateSettingsResponseDto,
  })
  @ExternalApiAccessible()
  updateMailSettings(
    @UserSession() user: IJwtPayload,
    @Body() body: UpdateMailSettingsRequestDto
  ): Promise<UpdateSettingsResponseDto> {
    return this.updateMailSettingsUsecase.execute(
      UpdateMailSettingsCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        senderEmail: body.senderEmail,
        senderName: body.senderName,
      })
    );
  }

  @Put('/sms/settings')
  @Roles(MemberRoleEnum.ADMIN)
  @ApiOperation({
    summary: 'Update sms settings',
  })
  @ApiOkResponse({
    type: UpdateSettingsResponseDto,
  })
  @ExternalApiAccessible()
  updateSmsSettings(
    @UserSession() user: IJwtPayload,
    @Body() body: UpdateSmsSettingsRequestDto
  ): Promise<UpdateSettingsResponseDto> {
    return this.updateSmsSettingsUsecase.execute(
      UpdateSmsSettingsCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        twillio: body.twillio,
      })
    );
  }
}
