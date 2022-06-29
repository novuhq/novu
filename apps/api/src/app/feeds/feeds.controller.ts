import { Body, ClassSerializerInterceptor, Controller, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { IJwtPayload, MemberRoleEnum } from '@novu/shared';
import { Roles } from '../auth/framework/roles.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { CreateFeed } from './usecases/create-feed/create-feed.usecase';
import { CreateFeedCommand } from './usecases/create-feed/create-feed.command';
import { CreateFeedDto } from './dto/create-feed.dto';

@Controller('/feeds')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class FeedsController {
  constructor(private createFeedUsecase: CreateFeed) {}

  @Post('')
  @Roles(MemberRoleEnum.ADMIN)
  createFeed(@UserSession() user: IJwtPayload, @Body() body: CreateFeedDto) {
    return this.createFeedUsecase.execute(
      CreateFeedCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        name: body.name,
      })
    );
  }
}
