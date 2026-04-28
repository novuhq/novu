export interface IClaudeManagedAgentDataDto {
  agentIdentifier: string;
  conversationId: string;
  environmentId: string;
  organizationId: string;
  integrationIdentifier: string;
  sessionId: string;
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
