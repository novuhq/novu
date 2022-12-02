import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { StorageController } from './storage.controller';

@Module({
  imports: [SharedModule],
  providers: [...USE_CASES],
  controllers: [StorageController],
})
export class StorageModule {}
