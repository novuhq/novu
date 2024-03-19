import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Put,
  UseGuards,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { IJwtPayload } from '@novu/shared';
import { UserSession } from '../shared/framework/user.decorator';
import { GetMyProfileUsecase } from './usecases/get-my-profile/get-my-profile.usecase';
import { GetMyProfileCommand } from './usecases/get-my-profile/get-my-profile.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { UserAuthGuard } from '../auth/framework/user.auth.guard';
import { UpdateOnBoardingCommand } from './usecases/update-on-boarding/update-on-boarding.command';
import { UpdateOnBoardingUsecase } from './usecases/update-on-boarding/update-on-boarding.usecase';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserOnboardingRequestDto } from './dtos/user-onboarding-request.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ChangeProfileEmailDto } from './dtos/change-profile-email.dto';
import { UpdateProfileEmail } from './usecases/update-profile-email/update-profile-email.usecase';
import { UpdateProfileEmailCommand } from './usecases/update-profile-email/update-profile-email.command';
import { ApiCommonResponses, ApiResponse, ApiOkResponse } from '../shared/framework/response.decorator';
import { UserOnboardingTourRequestDto } from './dtos/user-onboarding-tour-request.dto';
import { UpdateOnBoardingTourUsecase } from './usecases/update-on-boarding-tour/update-on-boarding-tour.usecase';
import { UpdateOnBoardingTourCommand } from './usecases/update-on-boarding-tour/update-on-boarding-tour.command';
import { UpdateProfileUseCase } from './usecases/update-profile/update-profile.usecase';
import { UpdateProfileCommand } from './usecases/update-profile/update-profile.command';
import { UpdateProfileDto } from './dtos/update-profile.dto';

@ApiCommonResponses()
@Controller('/users')
@ApiTags('Users')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(UserAuthGuard)
@ApiExcludeController()
export class UsersController {
  constructor(
    private getMyProfileUsecase: GetMyProfileUsecase,
    private updateOnBoardingUsecase: UpdateOnBoardingUsecase,
    private updateOnBoardingTourUsecase: UpdateOnBoardingTourUsecase,
    private updateProfileEmailUsecase: UpdateProfileEmail,
    private updateProfileUsecase: UpdateProfileUseCase
  ) {}

  @Get('/me')
  @ApiResponse(UserResponseDto)
  @ApiOperation({
    summary: 'Get User',
  })
  @ExternalApiAccessible()
  async getMyProfile(@UserSession() user: IJwtPayload): Promise<UserResponseDto> {
    Logger.verbose('Getting User');
    Logger.debug('User id: ' + user._id);
    Logger.verbose('Creating GetMyProfileCommand');

    const command = GetMyProfileCommand.create({
      userId: user._id,
    });

    return await this.getMyProfileUsecase.execute(command);
  }

  @Put('/profile')
  async updateProfile(@UserSession() user: IJwtPayload, @Body() body: UpdateProfileDto): Promise<UserResponseDto> {
    const { firstName, lastName, jobTitle } = body;

    return await this.updateProfileUsecase.execute(
      UpdateProfileCommand.create({
        userId: user._id,
        firstName: firstName,
        lastName: lastName,
        jobTitle: jobTitle,
      })
    );
  }

  @Put('/profile/email')
  async updateProfileEmail(
    @UserSession() user: IJwtPayload,
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
    @UserSession() user: IJwtPayload,
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
    @UserSession() user: IJwtPayload,
    @Body() body: UserOnboardingTourRequestDto
  ): Promise<UserResponseDto> {
    return await this.updateOnBoardingTourUsecase.execute(
      UpdateOnBoardingTourCommand.create({
        userId: user._id,
        showOnBoardingTour: body.showOnBoardingTour,
      })
    );
  }
}
