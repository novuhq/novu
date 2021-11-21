import { Module } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { ActivityController } from './activity.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [...USE_CASES],
  controllers: [ActivityController],
})
export class ActivityModule {}
