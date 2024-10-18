import { GetPreferences } from '@novu/application-generic';
import { GetStepSchemaUseCase } from './get-step-schema/get-step-schema.usecase';
import { GeneratePreviewUseCase } from './generate-preview/generate-preview-use-case';
import { VariableValidatorComponent } from '../components/variable-validator-component';
import { GetWorkflowUseCase } from '../../workflows-v2/usecases/get-workflow/get-workflow.usecase';
import { GetWorkflowByIdsUseCase } from '../../workflows-v2/usecases/get-workflow-by-ids/get-workflow-by-ids.usecase';

export const USE_CASES = [
  GetStepSchemaUseCase,
  GeneratePreviewUseCase,
  VariableValidatorComponent,
  GetWorkflowUseCase,
  GetPreferences,
  GetWorkflowByIdsUseCase,
];
