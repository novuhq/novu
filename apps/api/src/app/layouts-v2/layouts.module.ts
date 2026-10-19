import { Module } from '@nestjs/common';
import {
  BuildStepDataUsecase,
  BuildVariableSchemaUsecase,
  ControlValueSanitizerService,
  CreateVariablesObject,
  ExecuteStepResolverRequest,
  GetWorkflowByIdsUseCase,
  MockDataGeneratorService,
  PayloadMergerService,
  PreviewPayloadProcessorService,
  PreviewStep,
  UpsertControlValuesUseCase,
} from '@novu/application-generic';
import { AuthModule } from '../auth/auth.module';
import { LayoutsV1Module } from '../layouts-v1/layouts-v1.module';
import { SharedModule } from '../shared/shared.module';
import { LayoutsController } from './layouts.controller';
import { USE_CASES } from './usecases';

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
    ExecuteStepResolverRequest,
  ],
  exports: [...USE_CASES],
  controllers: [LayoutsController],
})
export class LayoutsV2Module {}
