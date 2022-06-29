import { Module } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { FeedsController } from './feeds.controller';
import { SharedModule } from '../shared/shared.module';
import { ChangeModule } from '../change/change.module';

@Module({
  imports: [SharedModule, ChangeModule],
  providers: [...USE_CASES],
  controllers: [FeedsController],
  exports: [...USE_CASES],
})
export class FeedsModule {}
