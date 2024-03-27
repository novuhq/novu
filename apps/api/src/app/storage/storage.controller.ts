import { ClassSerializerInterceptor, Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { IJwtPayload } from '@novu/shared';
import { GetSignedUrl } from './usecases/get-signed-url/get-signed-url.usecase';
import { GetSignedUrlCommand } from './usecases/get-signed-url/get-signed-url.command';
import { UserSession } from '../shared/framework/user.decorator';
import { UserAuthGuard } from '../auth/framework/user.auth.guard';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UploadUrlResponse } from './dtos/upload-url-response.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { GetUserProfilePictureSignedUrl } from './usecases/get-user-profile-picture-signed-url/get-user-profile-picture-signed-url.usecase';
import { GetUserProfilePictureSignedUrlCommand } from './usecases/get-user-profile-picture-signed-url/get-user-profile-picture-signed-url.command';

@ApiCommonResponses()
@Controller('/storage')
@ApiTags('Storage')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(UserAuthGuard)
@ApiExcludeController()
export class StorageController {
  constructor(
    private getSignedUrlUsecase: GetSignedUrl,
    private getUserProfilePictureSignedUrlUsecase: GetUserProfilePictureSignedUrl
  ) {}

  @Get('/upload-url')
  @ApiOperation({
    summary: 'Get upload url',
  })
  @ApiResponse(UploadUrlResponse)
  @ExternalApiAccessible()
  async signedUrl(@UserSession() user: IJwtPayload, @Query('extension') extension: string): Promise<UploadUrlResponse> {
    return await this.getSignedUrlUsecase.execute(
      GetSignedUrlCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        extension,
      })
    );
  }

  @Get('/upload-url/profile')
  @ApiOperation({
    summary: "Get upload url for  user's profile picture",
  })
  @ApiResponse(UploadUrlResponse)
  @ExternalApiAccessible()
  async profilePictureSignedUrl(
    @UserSession() user: IJwtPayload,
    @Query('extension') extension: string
  ): Promise<UploadUrlResponse> {
    return await this.getUserProfilePictureSignedUrlUsecase.execute(
      GetUserProfilePictureSignedUrlCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        extension,
      })
    );
  }
}
