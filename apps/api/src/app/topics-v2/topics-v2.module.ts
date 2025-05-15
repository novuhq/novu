import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { TopicsController } from './topics.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule],
  controllers: [TopicsController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class TopicsV2Module {}
