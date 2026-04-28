export type AgentProgressRenderer = 'slack_plan' | 'markdown';

export type AgentProgressTaskStatus = 'pending' | 'in_progress' | 'complete' | 'error';

export interface AgentProgressTask {
  id: string;
  title: string;
  status: AgentProgressTaskStatus;
  details?: string;
  output?: string;
}

export interface IClaudeManagedAgentDataDto {
  agentIdentifier: string;
  conversationId: string;
  environmentId: string;
  organizationId: string;
  integrationIdentifier: string;
  sessionId: string;
  platform: string;
  interimEditsSupported: boolean;
  progressRenderer?: AgentProgressRenderer;
  progressTasks?: AgentProgressTask[];
  placeholderMessageId?: string;
  placeholderPlatformThreadId?: string;
}

export interface IClaudeManagedAgentJobDto {
  name: string;
  data: IClaudeManagedAgentDataDto;
  groupId?: string;
  options?: {
    jobId?: string;
    attempts?: number;
    backoff?: {
      type: string;
      delay: number;
    };
  };
}
