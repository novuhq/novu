import { SeverityLevelEnum } from '../../consts';
import { ISubscribersDefine, ITenantDefine, ITopic, ProvidersIdEnum } from '../../types';
import type { WorkflowAgentConfig } from '../workflows/workflow.dto';

export type TriggerRecipientSubscriber = string | ISubscribersDefine;

export type TriggerRecipient = TriggerRecipientSubscriber | ITopic;

export type TriggerRecipients = TriggerRecipient[];

export type TriggerRecipientsPayload = TriggerRecipientSubscriber | TriggerRecipients;

export type TriggerTenantContext = string | ITenantDefine;

/**
 * Trigger-time agent override: identifier only.
 * Omit to inherit the workflow-assigned agent; pass null to disable agent-derived
 * defaults for this execution; pass an object to select a different agent.
 */
export type TriggerAgentConfig = Pick<WorkflowAgentConfig, 'identifier'>;

/** undefined = inherit workflow; null = opt out; object = override. */
export type TriggerAgentOverride = TriggerAgentConfig | null;

export type TriggerOverrides = {
  providers?: Record<ProvidersIdEnum, Record<string, unknown>>;
  steps?: Record<
    string,
    {
      providers?: Record<ProvidersIdEnum, Record<string, unknown>>;
      layoutId?: string | null;
    }
  >;
  channels?: {
    email?: {
      layoutId?: string | null;
    };
  };
  email?: Record<string, unknown> & {
    toRecipient?: string;
    replaceToRecipient?: boolean;
    integrationIdentifier?: string;
  };
  sms?: Record<string, unknown>;
  push?: Record<string, unknown>;
  inApp?: Record<string, unknown>;
  chat?: Record<string, unknown>;
  layoutIdentifier?: string;
  severity?: SeverityLevelEnum;
};
