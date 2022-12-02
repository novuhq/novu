import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { ChannelsController } from './channels.controller';

@Module({
  imports: [SharedModule],
  providers: [...USE_CASES],
  controllers: [ChannelsController],
})
export class ChannelsModule {}
