import { Module } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { ContentTemplatesController } from './content-templates.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
  controllers: [ContentTemplatesController],
})
export class ContentTemplatesModule {}
