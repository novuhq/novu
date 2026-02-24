export enum AiConversationStatusEnum {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export enum AiResourceTypeEnum {
  WORKFLOW = 'workflow',
}

export enum AiAgentTypeEnum {
  GENERATE_WORKFLOW = 'generate-workflow',
}

export enum AiMessageRoleEnum {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export enum SnapshotSourceTypeEnum {
  AI_CHAT = 'ai-chat',
}

export enum AiWorkflowToolsEnum {
  RETRIEVE_ORGANIZATION_META = 'retrieveOrganizationMeta',
  SET_WORKFLOW_METADATA = 'setWorkflowMetadata',
  ADD_STEP = 'addStep',
  COMPLETE_WORKFLOW = 'completeWorkflow',
  EDIT_STEP_CONTENT = 'editStepContent',
  REMOVE_STEP = 'removeStep',
}

export enum AiWorkflowToolsNameEnum {
  RETRIEVE_ORGANIZATION_META = `tool-retrieveOrganizationMeta`,
  SET_WORKFLOW_METADATA = `tool-setWorkflowMetadata`,
  ADD_STEP = 'tool-addStep',
  COMPLETE_WORKFLOW = 'tool-completeWorkflow',
  EDIT_STEP_CONTENT = 'tool-editStepContent',
  UPDATE_WORKFLOW_METADATA = 'tool-updateWorkflowMetadata',
  REMOVE_STEP = 'tool-removeStep',
}
