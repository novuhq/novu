import { Module } from '@nestjs/common';
import { CommunityOrganizationRepository } from '@novu/dal';
import { LayoutsV1Module } from '../layouts-v1/layouts-v1.module';
import { SharedModule } from '../shared/shared.module';
import { ContentTemplatesController } from './content-templates.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, LayoutsV1Module],
  providers: [...USE_CASES, CommunityOrganizationRepository],
  exports: [...USE_CASES],
  controllers: [ContentTemplatesController],
})
export class ContentTemplatesModule {}
