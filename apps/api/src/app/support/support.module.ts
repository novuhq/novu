import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [SupportController],
})
export class SupportModule {}
