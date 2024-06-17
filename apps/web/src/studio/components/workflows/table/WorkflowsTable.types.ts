interface IBridgeWorkflow {
  workflowId: string;
  code: string;
  steps: {
    stepId: string;
    type: string;
  }[];
}

export type WorkflowTableRow = IBridgeWorkflow;
