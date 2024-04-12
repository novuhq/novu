import { ClassSerializerInterceptor, Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { IJwtPayload, UploadTypesEnum } from '@novu/shared';

import { GetSignedUrl } from './usecases/get-signed-url/get-signed-url.usecase';
import { GetSignedUrlCommand } from './usecases/get-signed-url/get-signed-url.command';
import { UserSession } from '../shared/framework/user.decorator';
import { UserAuthGuard } from '../auth/framework/user.auth.guard';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UploadUrlResponse } from './dtos/upload-url-response.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';

@ApiCommonResponses()
@Controller('/storage')
@ApiTags('Storage')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(UserAuthGuard)
@ApiExcludeController()
export class StorageController {
  constructor(private getSignedUrlUsecase: GetSignedUrl) {}

  @Get('/upload-url')
  @ApiOperation({
    summary: 'Get upload url',
  })
  @ApiResponse(UploadUrlResponse)
  @ExternalApiAccessible()
  async signedUrl(
    @UserSession() user: IJwtPayload,
    @Query('extension') extension: string,
    @Query('type') type: UploadTypesEnum = UploadTypesEnum.BRANDING
  ): Promise<UploadUrlResponse> {
    return await this.getSignedUrlUsecase.execute(
      GetSignedUrlCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        extension,
        type,
      })
    );
  }
}
