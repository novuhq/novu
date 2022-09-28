import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { USE_CASES } from './usecases';
import { ActivityController } from './activity.controller';

@Module({
  imports: [SharedModule, AuthModule],
  providers: [...USE_CASES],
  controllers: [ActivityController],
})
export class ActivityModule {}
