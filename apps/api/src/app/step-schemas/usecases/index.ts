import { GetPreferences } from '@novu/application-generic';
import { GetStepSchemaUseCase } from './get-step-schema/get-step-schema.usecase';
import { GeneratePreviewUsecase } from './generate-preview/generate-preview-usecase';
import { GetWorkflowUseCase } from '../../workflows-v2/usecases/get-workflow/get-workflow.usecase';
import { GetWorkflowByIdsUseCase } from '../../workflows-v2/usecases/get-workflow-by-ids/get-workflow-by-ids.usecase';

export const USE_CASES = [
  GetStepSchemaUseCase,
  GeneratePreviewUsecase,
  GetWorkflowUseCase,
  GetPreferences,
  GetWorkflowByIdsUseCase,
];
