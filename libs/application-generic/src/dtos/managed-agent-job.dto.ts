import { IJobParams } from '../services/queues/queue-base.service';

export interface IManagedAgentJobData {
  agentId: string;
  conversationId: string;
  environmentId: string;
  organizationId: string;
  integrationIdentifier: string;
  agentIdentifier: string;
  platform: string;
  /** The inbound message text */
  messageText: string;
  subscriberId?: string;
  subscriberFirstName?: string;
  /** Platform thread ID for HandleAgentReply delivery */
  platformThreadId: string;
}

export interface IManagedAgentJobDto extends IJobParams {
  data: IManagedAgentJobData;
}
