import { AiConversationStatusEnum, AiMessageRoleEnum, IEnvironment, WorkflowResponseDto } from '@novu/shared';
import { postV2 } from './api.client';

export type GenerateWorkflowRequest = {
  prompt: string;
};

export type AiMessage = {
  role: AiMessageRoleEnum;
  content: string;
  timestamp: Date;
};

export type ChannelRecommendation = {
  channel: string;
  reason: string;
  priority: number;
};

export type WorkflowReasoning = {
  summary: string;
  channelRecommendations: ChannelRecommendation[];
  bestPractices: string[];
};

export type GenerateWorkflowResponse = {
  messages: AiMessage[];
  status: AiConversationStatusEnum;
  workflow: WorkflowResponseDto;
  reasoning: WorkflowReasoning;
};

export async function generateWorkflow({
  environment,
  prompt,
}: {
  environment: IEnvironment;
  prompt: string;
}): Promise<GenerateWorkflowResponse> {
  const { data: responseData } = await postV2<{ data: GenerateWorkflowResponse }>('/ai/generate-workflow', {
    environment,
    body: { prompt },
  });

  return responseData;
}
