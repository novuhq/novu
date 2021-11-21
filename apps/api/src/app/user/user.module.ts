import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { UsersController } from './user.controller';

@Module({
  imports: [SharedModule],
  controllers: [UsersController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class UserModule {}
