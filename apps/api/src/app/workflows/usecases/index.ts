import { ChangeWorkflowActiveStatus } from './change-workflow-active-status/change-workflow-active-status.usecase';
import { UpdateWorkflow } from './update-workflow/update-workflow.usecase';
import { GetWorkflows } from './get-workflows/get-workflows.usecase';
import { CreateWorkflow } from './create-workflow';
import { GetWorkflow } from './get-workflow/get-workflow.usecase';
import { DeleteWorkflow } from './delete-workflow/delete-workflow.usecase';

export const USE_CASES = [
  //
  ChangeWorkflowActiveStatus,
  UpdateWorkflow,
  GetWorkflows,
  CreateWorkflow,
  GetWorkflow,
  DeleteWorkflow,
];
