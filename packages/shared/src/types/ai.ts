export enum AiConversationStatusEnum {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export enum AiResourceTypeEnum {
  WORKFLOW = 'workflow',
}

export enum AiAgentTypeEnum {
  CREATE_WORKFLOW = 'create-workflow',
  ADD_WORKFLOW_STEPS = 'add-workflow-steps',
}

export enum AiMessageRoleEnum {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export enum AiWorkflowToolsEnum {
  RETRIEVE_ORGANIZATION_META = 'retrieveOrganizationMeta',
  SET_WORKFLOW_METADATA = 'setWorkflowMetadata',
  ADD_EMAIL_STEP = 'addEmailStep',
  ADD_IN_APP_STEP = 'addInAppStep',
  ADD_SMS_STEP = 'addSmsStep',
  ADD_PUSH_STEP = 'addPushStep',
  ADD_CHAT_STEP = 'addChatStep',
  ADD_DIGEST_STEP = 'addDigestStep',
  ADD_DELAY_STEP = 'addDelayStep',
  ADD_THROTTLE_STEP = 'addThrottleStep',
  COMPLETE_WORKFLOW = 'completeWorkflow',
}

export enum AiWorkflowToolsNameEnum {
  RETRIEVE_ORGANIZATION_META = `tool-retrieveOrganizationMeta`,
  SET_WORKFLOW_METADATA = `tool-setWorkflowMetadata`,
  ADD_EMAIL_STEP = 'tool-addEmailStep',
  ADD_IN_APP_STEP = 'tool-addInAppStep',
  ADD_SMS_STEP = 'tool-addSmsStep',
  ADD_PUSH_STEP = 'tool-addPushStep',
  ADD_CHAT_STEP = 'tool-addChatStep',
  ADD_DIGEST_STEP = 'tool-addDigestStep',
  ADD_DELAY_STEP = 'tool-addDelayStep',
  ADD_THROTTLE_STEP = 'tool-addThrottleStep',
  COMPLETE_WORKFLOW = 'tool-completeWorkflow',
}
