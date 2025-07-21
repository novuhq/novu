export class WorkflowRunDto {
  workflowRunId: string;
  workflowId: string;
  workflowName: string;
  organizationId: string;
  environmentId: string;
  subscriberId: string;
  externalSubscriberId?: string;
  status: string;
  triggerIdentifier: string;
  transactionId: string;
  channels: string[];
  subscriberTo?: any;
  payload?: any;
  controlValues?: any;
  topics?: string[];
  isDigest: boolean;
  digestedWorkflowRunId?: string;
  createdAt: string;
  updatedAt: string;
  steps?: Array<{
    stepRunId: string;
    stepId: string;
    stepType: string;
    stepName: string;
    providerId?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    executionDetails: any[];
  }>;
}

export class GetWorkflowRunsResponseDto {
  data: WorkflowRunDto[];
  nextCursor?: string;
  previousCursor?: string;
  hasMore: boolean;
  pageSize: number;
}
