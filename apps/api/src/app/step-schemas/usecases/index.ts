import { GetPreferences } from '@novu/application-generic';
import { GetStepSchema } from './get-step-schema/get-step-schema.usecase';
import { GeneratePreviewUseCase } from './generate-preview/generate-preview-use-case';
import { VariableValidatorComponent } from '../components/variable-validator-component';
import { GetWorkflowUseCase } from '../../workflows-v2/usecases/get-workflow/get-workflow.usecase';

export const USE_CASES = [
  GetStepSchema,
  GeneratePreviewUseCase,
  VariableValidatorComponent,
  GetWorkflowUseCase,
  GetPreferences,
];
