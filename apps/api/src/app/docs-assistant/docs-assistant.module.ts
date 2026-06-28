import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { DocsAssistantController } from './docs-assistant.controller';
import { SearchDocsUsecase } from './usecases/search-docs';
import { SendDocsMessageUsecase } from './usecases/send-docs-message';

@Module({
  imports: [SharedModule],
  controllers: [DocsAssistantController],
  providers: [SearchDocsUsecase, SendDocsMessageUsecase],
})
export class DocsAssistantModule {}
