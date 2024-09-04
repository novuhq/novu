import { Body, ClassSerializerInterceptor, Controller, Get, Logger, Put, UseInterceptors } from '@nestjs/common';
import { UserSessionData } from '@novu/shared';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserSession } from '../shared/framework/user.decorator';
import { GetMyProfileUsecase } from './usecases/get-my-profile/get-my-profile.usecase';
import { GetMyProfileCommand } from './usecases/get-my-profile/get-my-profile.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { UpdateOnBoardingCommand } from './usecases/update-on-boarding/update-on-boarding.command';
import { UpdateOnBoardingUsecase } from './usecases/update-on-boarding/update-on-boarding.usecase';
import { UserOnboardingRequestDto } from './dtos/user-onboarding-request.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ChangeProfileEmailDto } from './dtos/change-profile-email.dto';
import { UpdateProfileEmail } from './usecases/update-profile-email/update-profile-email.usecase';
import { UpdateProfileEmailCommand } from './usecases/update-profile-email/update-profile-email.command';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserOnboardingTourRequestDto } from './dtos/user-onboarding-tour-request.dto';
import { UpdateOnBoardingTourUsecase } from './usecases/update-on-boarding-tour/update-on-boarding-tour.usecase';
import { UpdateOnBoardingTourCommand } from './usecases/update-on-boarding-tour/update-on-boarding-tour.command';
import { UpdateNameAndProfilePicture } from './usecases/update-name-and-profile-picture/update-name-and-profile-picture.usecase';
import { UpdateNameAndProfilePictureCommand } from './usecases/update-name-and-profile-picture/update-name-and-profile-picture.command';
import { UpdateProfileRequestDto } from './dtos/update-profile-request.dto';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';

@ApiCommonResponses()
@Controller('/users')
@ApiTags('Users')
@UseInterceptors(ClassSerializerInterceptor)
@UserAuthentication()
@ApiExcludeController()
export class UsersController {
  constructor(
    private getMyProfileUsecase: GetMyProfileUsecase,
    private updateOnBoardingUsecase: UpdateOnBoardingUsecase,
    private updateOnBoardingTourUsecase: UpdateOnBoardingTourUsecase,
    private updateProfileEmailUsecase: UpdateProfileEmail,
    private updateNameAndProfilePictureUsecase: UpdateNameAndProfilePicture
  ) {}

  @Get('/me')
  @ApiResponse(UserResponseDto)
  @ApiOperation({
    summary: 'Get User',
  })
  @ExternalApiAccessible()
  async getMyProfile(@UserSession() user: UserSessionData): Promise<UserResponseDto> {
    Logger.verbose('Getting User');
    Logger.debug(`User id: ${user._id}`);
    Logger.verbose('Creating GetMyProfileCommand');

    const command = GetMyProfileCommand.create({
      userId: user._id,
    });

    return await this.getMyProfileUsecase.execute(command);
  }

  @Put('/profile/email')
  async updateProfileEmail(
    @UserSession() user: UserSessionData,
    @Body() body: ChangeProfileEmailDto
  ): Promise<UserResponseDto> {
    return await this.updateProfileEmailUsecase.execute(
      UpdateProfileEmailCommand.create({
        userId: user._id,
        email: body.email,
        environmentId: user.environmentId,
      })
    );
  }

  @Put('/onboarding')
  @ApiResponse(UserResponseDto)
  @ApiOperation({
    summary: 'Update onboarding',
  })
  @ExternalApiAccessible()
  async updateOnBoarding(
    @UserSession() user: UserSessionData,
    @Body() body: UserOnboardingRequestDto
  ): Promise<UserResponseDto> {
    return await this.updateOnBoardingUsecase.execute(
      UpdateOnBoardingCommand.create({
        userId: user._id,
        showOnBoarding: body.showOnBoarding,
      })
    );
  }

  @Put('/onboarding-tour')
  async updateOnBoardingTour(
    @UserSession() user: UserSessionData,
    @Body() body: UserOnboardingTourRequestDto
  ): Promise<UserResponseDto> {
    return await this.updateOnBoardingTourUsecase.execute(
      UpdateOnBoardingTourCommand.create({
        userId: user._id,
        showOnBoardingTour: body.showOnBoardingTour,
      })
    );
  }

  @Put('/profile')
  @ApiOperation({
    summary: 'Update user name and profile picture',
  })
  @ExternalApiAccessible()
  async updateProfile(
    @UserSession() user: UserSessionData,
    @Body() body: UpdateProfileRequestDto
  ): Promise<UserResponseDto> {
    return await this.updateNameAndProfilePictureUsecase.execute(
      UpdateNameAndProfilePictureCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        firstName: body.firstName,
        lastName: body.lastName,
        profilePicture: body.profilePicture,
        organizationId: user.organizationId,
      })
    );
  }
}
