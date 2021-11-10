import { ClassSerializerInterceptor, Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IJwtPayload } from '@notifire/shared';
import { UserSession } from '../shared/framework/user.decorator';
import { GetMyProfileUsecase } from './usecases/get-my-profile/get-my-profile.usecase';
import { GetMyProfileCommand } from './usecases/get-my-profile/get-my-profile.dto';
import { IGetMyProfileDto } from './dtos/get-my-profile';
import { JwtAuthGuard } from '../auth/framework/auth.guard';

@Controller('/users')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private getMyProfileUsecase: GetMyProfileUsecase) {}

  @Get('/me')
  async getMyProfile(@UserSession() user: IJwtPayload): Promise<IGetMyProfileDto> {
    const command = GetMyProfileCommand.create({
      userId: user._id,
    });

    return await this.getMyProfileUsecase.execute(command);
  }
}
