export type {
  AgentEmailInboxCap,
  AgentEmailInboxReservation,
  AgentEmailInboxSendAttempt,
} from './agent-email-inbox-quota.service';
export {
  AgentEmailInboxQuotaExceededException,
  AgentEmailInboxQuotaService,
  isAgentEmailInboxQuotaExceeded,
  quotaKeys,
} from './agent-email-inbox-quota.service';
