import { Body, ClassSerializerInterceptor, Controller, UseGuards, UseInterceptors, Logger, Post } from '@nestjs/common';
import { IJwtPayload } from '@novu/shared';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserAuthGuard, UserSession } from '@novu/application-generic';
import { UserEntity } from '@novu/dal';
import { SyncExternalUserCommand } from './usecases/sync-external-user/sync-external-user.command';
import { SyncExternalUser } from './usecases/sync-external-user/sync-external-user.usecase';

@Controller('/users')
@ApiTags('Users')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(UserAuthGuard)
@ApiExcludeController()
export class EEUserController {
  constructor(private readonly syncExternalUserUsecase: SyncExternalUser) {}

  @Post('/')
  @ApiOperation({
    summary: 'Sync external Clerk user with internal db',
  })
  async syncExternalUser(@UserSession() user: IJwtPayload): Promise<UserEntity> {
    Logger.verbose('Syncing external Clerk user', user._id);

    return this.syncExternalUserUsecase.execute(
      SyncExternalUserCommand.create({
        userId: user._id,
      })
    );
  }
}
