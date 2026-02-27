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
  ADD_STEP_IN_BETWEEN = 'addStepInBetween',
  EDIT_STEP_CONTENT = 'editStepContent',
  UPDATE_STEP_CONDITIONS = 'updateStepConditions',
  REMOVE_STEP = 'removeStep',
  MOVE_STEP = 'moveStep',
}

export enum AiWorkflowToolsNameEnum {
  RETRIEVE_ORGANIZATION_META = `tool-retrieveOrganizationMeta`,
  SET_WORKFLOW_METADATA = `tool-setWorkflowMetadata`,
  ADD_STEP = 'tool-addStep',
  ADD_STEP_IN_BETWEEN = 'tool-addStepInBetween',
  EDIT_STEP_CONTENT = 'tool-editStepContent',
  UPDATE_STEP_CONDITIONS = 'tool-updateStepConditions',
  REMOVE_STEP = 'tool-removeStep',
  MOVE_STEP = 'tool-moveStep',
}
