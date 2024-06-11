import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { EEUserController } from './ee.user.controller';
import { USE_CASES } from './usecases';
import { UsersController } from './user.controller';

function getControllers() {
  if (process.env.NOVU_ENTERPRISE === 'true') {
    return [EEUserController];
  }

  return [UsersController];
}

@Module({
  imports: [SharedModule],
  controllers: [...getControllers()],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class UserModule {}
