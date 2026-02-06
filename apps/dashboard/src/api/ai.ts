import {
  AiConversationStatusEnum,
  AiMessageRoleEnum,
  AiResourceTypeEnum,
  IEnvironment,
  WorkflowResponseDto,
} from '@novu/shared';
import { UIMessage } from 'ai';
import { getApiBaseUrl, getV2, postV2 } from './api.client';

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

export type AiChatResponseDto = {
  _id: string;
  _organizationId: string;
  _environmentId: string;
  _userId: string;

  resourceType: AiResourceTypeEnum;
  resourceId?: string;

  messages: UIMessage[];
  activeStreamId?: string | null;

  createdAt: string;
  updatedAt: string;
};

export async function createAiChat({
  environment,
  resourceType,
  resourceId,
}: {
  environment: IEnvironment;
  resourceType: AiResourceTypeEnum;
  resourceId?: string;
}): Promise<AiChatResponseDto> {
  const { data: responseData } = await postV2<{ data: AiChatResponseDto }>('/ai/chat', {
    environment,
    body: { resourceType, resourceId },
  });

  return responseData;
}

export async function fetchLatestChat({
  environment,
  resourceType,
  resourceId,
}: {
  environment: IEnvironment;
  resourceType: AiResourceTypeEnum;
  resourceId: string;
}): Promise<AiChatResponseDto> {
  const { data: responseData } = await getV2<{ data: AiChatResponseDto }>(
    `/ai/chat/${resourceType}/${resourceId}/latest`,
    { environment }
  );

  return responseData;
}

export async function fetchChat({
  environment,
  id,
}: {
  environment: IEnvironment;
  id: string;
}): Promise<AiChatResponseDto> {
  const { data: responseData } = await getV2<{ data: AiChatResponseDto }>(`/ai/chat/${id}`, { environment });
  return responseData;
}

export function getChatSteamUrl(): string {
  return `${getApiBaseUrl()}/v2/ai/chat-stream`;
}

export function getChatStreamResumeUrl(id: string): string {
  return `${getApiBaseUrl()}/v2/ai/chat/${id}/stream`;
}
