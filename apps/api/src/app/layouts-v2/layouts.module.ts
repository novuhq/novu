import { Module } from '@nestjs/common';
import { GetWorkflowByIdsUseCase, UpsertControlValuesUseCase } from '@novu/application-generic';

import { USE_CASES } from './usecases';
import { LayoutsController } from './layouts.controller';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { LayoutsV1Module } from '../layouts-v1/layouts-v1.module';
import { CreateVariablesObject } from '../shared/usecases/create-variables-object/create-variables-object.usecase';
import { ControlValueSanitizerService } from '../shared/services/control-value-sanitizer.service';
import { PreviewPayloadProcessorService } from '../workflows-v2/usecases/preview/services/preview-payload-processor.service';
import { PreviewStep } from '../bridge/usecases/preview-step';
import { PayloadMergerService } from '../workflows-v2/usecases/preview/services/payload-merger.service';
import { MockDataGeneratorService } from '../workflows-v2/usecases/preview/services/mock-data-generator.service';
import { BuildStepDataUsecase, BuildVariableSchemaUsecase } from '../workflows-v2/usecases';

const MODULES = [SharedModule, AuthModule, LayoutsV1Module];

@Module({
  imports: MODULES,
  providers: [
    ...USE_CASES,
    UpsertControlValuesUseCase,
    CreateVariablesObject,
    ControlValueSanitizerService,
    PreviewPayloadProcessorService,
    MockDataGeneratorService,
    GetWorkflowByIdsUseCase,
    BuildVariableSchemaUsecase,
    BuildStepDataUsecase,
    PayloadMergerService,
    PreviewStep,
  ],
  exports: [...USE_CASES],
  controllers: [LayoutsController],
})
export class LayoutsV2Module {}
