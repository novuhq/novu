import { CreateWorkflowOverride } from './create-workflow-override/create-workflow-override.usecase';
import { UpdateWorkflowOverride } from './update-workflow-override/update-workflow-override.usecase';
import { GetWorkflowOverride } from './get-workflow-override/get-workflow-override.usecase';
import { DeleteWorkflowOverride } from './delete-workflow-override/delete-workflow-override.usecase';
import { GetWorkflowOverrides } from './get-workflow-overrides/get-workflow-overrides.usecase';
import { GetWorkflowOverrideById } from './get-workflow-override-by-id/get-workflow-override-by-id.usecase';
import { UpdateWorkflowOverrideById } from './update-workflow-override-by-id/update-workflow-override-by-id.usecase';

export const USE_CASES = [
  CreateWorkflowOverride,
  UpdateWorkflowOverride,
  GetWorkflowOverride,
  DeleteWorkflowOverride,
  GetWorkflowOverrides,
  GetWorkflowOverrideById,
  UpdateWorkflowOverrideById,
];
