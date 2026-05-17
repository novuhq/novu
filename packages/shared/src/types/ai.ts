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
  ONBOARDING_WORKFLOWS = 'onboarding-workflows',
  WORKFLOW_SUGGESTIONS = 'workflow-suggestions',
}

export enum AiWorkflowToolsEnum {
  REASONING = 'reasoning',
  SET_WORKFLOW_METADATA = 'setWorkflowMetadata',
  ADD_STEP = 'addStep',
  ADD_STEP_IN_BETWEEN = 'addStepInBetween',
  EDIT_STEP_CONTENT = 'editStepContent',
  UPDATE_STEP_CONDITIONS = 'updateStepConditions',
  REMOVE_STEP = 'removeStep',
  MOVE_STEP = 'moveStep',
  UPDATE_PAYLOAD_SCHEMA = 'updatePayloadSchema',
}

export enum AiWorkflowToolsNameEnum {
  REASONING = 'tool-reasoning',
  SET_WORKFLOW_METADATA = `tool-setWorkflowMetadata`,
  ADD_STEP = 'tool-addStep',
  ADD_STEP_IN_BETWEEN = 'tool-addStepInBetween',
  EDIT_STEP_CONTENT = 'tool-editStepContent',
  UPDATE_STEP_CONDITIONS = 'tool-updateStepConditions',
  REMOVE_STEP = 'tool-removeStep',
  MOVE_STEP = 'tool-moveStep',
  UPDATE_PAYLOAD_SCHEMA = 'tool-updatePayloadSchema',
}

export enum AiResumeActionEnum {
  TRY_AGAIN = 'tryAgain',
  REVERT = 'revert',
}

export enum AiWorkflowSuggestion {
  AUTOCOMPLETE = 'Autocomplete this workflow',
  APPLY_CONDITIONS = 'Apply step conditions',
  IMPROVE_MESSAGING = 'Improve messaging',
  FIX_WORKFLOW_ISSUES = 'Fix workflow issues',
  FIX_STEP_ISSUES = 'Fix step issues',
  GENERATE_STEP_CONTENT = 'Generate step content',
}
