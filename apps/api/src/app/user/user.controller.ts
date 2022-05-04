import { Body, ClassSerializerInterceptor, Controller, Get, Put, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IJwtPayload } from '@novu/shared';
import { UserSession } from '../shared/framework/user.decorator';
import { GetMyProfileUsecase } from './usecases/get-my-profile/get-my-profile.usecase';
import { GetMyProfileCommand } from './usecases/get-my-profile/get-my-profile.dto';
import { IGetMyProfileDto } from './dtos/get-my-profile';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { UpdateOnBoardingCommand } from './usecases/update-on-boarding/update-on-boarding.command';
import { UpdateOnBoardingUsecase } from './usecases/update-on-boarding/update-on-boarding.usecase';

@Controller('/users')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private getMyProfileUsecase: GetMyProfileUsecase,
    private updateOnBoardingUsecase: UpdateOnBoardingUsecase
  ) {}

  @Get('/me')
  async getMyProfile(@UserSession() user: IJwtPayload): Promise<IGetMyProfileDto> {
    const command = GetMyProfileCommand.create({
      userId: user._id,
    });

    return await this.getMyProfileUsecase.execute(command);
  }

  @Put('/onboarding')
  async updateOnBoarding(@UserSession() user: IJwtPayload, @Body() body: { onBoarding: boolean }) {
    return await this.updateOnBoardingUsecase.execute(
      UpdateOnBoardingCommand.create({
        userId: user._id,
        onBoarding: body.onBoarding,
      })
    );
  }
}
