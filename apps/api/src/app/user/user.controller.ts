import { Body, ClassSerializerInterceptor, Controller, Get, Put, UseGuards, UseInterceptors } from '@nestjs/common';
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

@Controller('/users')
@ApiTags('Users')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiExcludeController()
export class UsersController {
  constructor(
    private getMyProfileUsecase: GetMyProfileUsecase,
    private updateOnBoardingUsecase: UpdateOnBoardingUsecase
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
    const command = GetMyProfileCommand.create({
      userId: user._id,
    });

    return await this.getMyProfileUsecase.execute(command);
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
