import type { ICredentials } from '@novu/shared';
import type { ReactNode } from 'react';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import type { StepStatus } from '../../setup-guide-step-utils';

export type WhatsNextStep = {
  title: ReactNode;
  description: ReactNode;
  sectionLabel?: string;
  headerSlot?: ReactNode;
  rightContent?: ReactNode;
  extraContent?: ReactNode;
  fullWidthContent?: ReactNode;
  /** Defaults to `completed` for recap steps and `current` for developer steps. */
  status?: StepStatus;
};

export type ChannelWhatsNextConfig = {
  /** Completed connection-setup steps, collapsed behind a "Show all N instructions" toggle. */
  recapSteps: WhatsNextStep[];
  /** New "what's next" developer-integration steps rendered after the recap. */
  devSteps: WhatsNextStep[];
};

export type WhatsNextConfigContext = {
  agent: AgentResponse;
  integrationLink: AgentIntegrationLink;
  credentials?: ICredentials;
  /** Current environment's identifier — used as the Novu `applicationIdentifier` in code samples and prompts. */
  applicationIdentifier?: string;
};

export type ChannelWhatsNextConfigBuilder = (ctx: WhatsNextConfigContext) => ChannelWhatsNextConfig;
