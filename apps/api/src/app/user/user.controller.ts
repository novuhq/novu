import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Put,
  UseGuards,
  UseInterceptors,
  Logger,
  ExecutionContext,
} from '@nestjs/common';
import { IJwtPayload } from '@novu/shared';
import { UserSession } from '../shared/framework/user.decorator';
import { GetMyProfileUsecase } from './usecases/get-my-profile/get-my-profile.usecase';
import { GetMyProfileCommand } from './usecases/get-my-profile/get-my-profile.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { UpdateOnBoardingCommand } from './usecases/update-on-boarding/update-on-boarding.command';
import { UpdateOnBoardingUsecase } from './usecases/update-on-boarding/update-on-boarding.usecase';
import { ApiExcludeController, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserOnboardingRequestDto } from './dtos/user-onboarding-request.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ChangeProfileEmailDto } from './dtos/change-profile-email.dto';
import { UpdateProfileEmail } from './usecases/update-profile-email/update-profile-email.usecase';
import { UpdateProfileEmailCommand } from './usecases/update-profile-email/update-profile-email.command';

@Controller('/users')
@ApiTags('Users')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiExcludeController()
export class UsersController {
  constructor(
    private getMyProfileUsecase: GetMyProfileUsecase,
    private updateOnBoardingUsecase: UpdateOnBoardingUsecase,
    private updateProfileEmailUsecase: UpdateProfileEmail
  ) {}

  @Get('/me')
  @ApiOkResponse({
    type: UserResponseDto,
  })
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

  @Put('/profile/email')
  async updateProfileEmail(
    @UserSession() user: IJwtPayload,
    @Body() body: ChangeProfileEmailDto
  ): Promise<UserResponseDto> {
    return await this.updateProfileEmailUsecase.execute(
      UpdateProfileEmailCommand.create({
        userId: user._id,
        email: body.email,
      })
    );
  }

  @Put('/onboarding')
  @ApiOkResponse({
    type: UserResponseDto,
  })
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
}
