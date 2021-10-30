import { Module } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { ChannelsController } from './channels.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [...USE_CASES],
  controllers: [ChannelsController],
})
export class ChannelsModule {}
