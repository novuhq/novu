import { createStepSchemaClient } from './step-schemas-client';
import { createWorkflowClient } from './workflows-client';

export const createNovuClient = (baseUrl: string, headers: HeadersInit = {}) => {
  const stepSchemaClient = createStepSchemaClient(baseUrl, headers);
  const workflowClient = createWorkflowClient(baseUrl, headers);

  return {
    stepSchema: stepSchemaClient,
    workflow: workflowClient,
  };
};
