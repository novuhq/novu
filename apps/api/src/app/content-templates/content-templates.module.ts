import { DynamicModule, Module } from '@nestjs/common';
import { ForwardReference } from '@nestjs/common/interfaces/modules/forward-reference.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { CommunityOrganizationRepository } from '@novu/dal';
import { LayoutsV1Module } from '../layouts-v1/layouts-v1.module';
import { SharedModule } from '../shared/shared.module';
import { ContentTemplatesController } from './content-templates.controller';
import { USE_CASES } from './usecases';

const enterpriseImports = (): Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> => {
  const modules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [];
  if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
    if (require('@novu/ee-translation')?.EnterpriseTranslationModule) {
      modules.push(require('@novu/ee-translation')?.EnterpriseTranslationModule);
    }
  }

  return modules;
};

@Module({
  imports: [SharedModule, LayoutsV1Module, ...enterpriseImports()],
  providers: [...USE_CASES, CommunityOrganizationRepository],
  exports: [...USE_CASES],
  controllers: [ContentTemplatesController],
})
export class ContentTemplatesModule {}
