import { Module } from '@nestjs/common';
import { ShutdownService } from './shutdown.service';

@Module({
  providers: [ShutdownService],
  exports: [ShutdownService],
})
export class ShutdownModule {}
