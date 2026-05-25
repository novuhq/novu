import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import type { ReactNode } from 'react';
import { RiFileCodeLine } from 'react-icons/ri';
import { AwsIcon } from '@/components/icons/aws';
import { MistralIcon } from '@/components/icons/mistral';
import { ClaudeIcon } from '../../icons/claude';
import { GoogleIcon } from '../../icons/google';

export type ConnectorId = 'claude' | 'claude-aws' | 'vertex' | 'bedrock' | 'mistral' | 'scratch' | 'custom-scaffold';

export type ConnectorGroup = 'external' | 'custom';

export type ConnectorOption = {
  id: ConnectorId;
  label: string;
  group: ConnectorGroup;
  icon: ReactNode;
  comingSoon: boolean;
  /**
   * Maps the UI option onto an internal `RuntimeType` recognized by the agent creation pipeline.
   * Coming-soon options omit this to make them unselectable.
   */
  runtime?: 'scratch' | 'claude' | 'vertex';
  /**
   * Managed-runtime provider id for connectors that ship an Integration-backed runtime.
   * Drives integration filtering and the verify-credentials endpoint.
   */
  providerId?: AgentRuntimeProviderIdEnum;
  /** Short provider name shown inside inline prompts (e.g. "Setup Anthropic credentials"). */
  providerLabel?: string;
};

const CLAUDE_AVATAR = (
  <div className="bg-primary-base/10 text-primary-base flex size-4 items-center justify-center rounded-full">
    <ClaudeIcon className="size-3" />
  </div>
);

const GOOGLE_AVATAR = (
  <div className="bg-primary-base/10 flex size-4 items-center justify-center rounded-full">
    <GoogleIcon className="size-3" />
  </div>
);

const CUSTOM_CODE_AVATAR = (
  <div className="bg-bg-weak text-text-sub flex size-4 items-center justify-center rounded-full">
    <RiFileCodeLine className="size-3" />
  </div>
);

const AWS_AVATAR = (
  <div className="bg-bg-weak text-text-sub flex size-4 items-center justify-center rounded-full text-[10px] font-semibold">
    <AwsIcon className="size-3" />
  </div>
);

const MISTRAL_AVATAR = (
  <div className="bg-bg-weak text-text-sub flex size-4 items-center justify-center rounded-full text-[10px] font-semibold">
    <MistralIcon className="size-3" />
  </div>
);

export const CONNECTOR_OPTIONS: ConnectorOption[] = [
  {
    id: 'claude',
    label: 'Claude Managed Agent',
    group: 'external',
    icon: CLAUDE_AVATAR,
    comingSoon: false,
    runtime: 'claude',
    providerId: AgentRuntimeProviderIdEnum.Anthropic,
    providerLabel: 'Anthropic',
  },
  {
    id: 'claude-aws',
    label: 'AWS Claude Managed Agent',
    group: 'external',
    icon: AWS_AVATAR,
    comingSoon: false,
    runtime: 'claude',
    providerId: AgentRuntimeProviderIdEnum.AnthropicAws,
    providerLabel: 'AWS Claude Platform',
  },
  {
    id: 'vertex',
    label: 'Google Vertex AI',
    group: 'external',
    icon: GOOGLE_AVATAR,
    comingSoon: true,
  },
  {
    id: 'bedrock',
    label: 'AWS Bedrock AgentCore',
    group: 'external',
    icon: AWS_AVATAR,
    comingSoon: true,
  },
  {
    id: 'mistral',
    label: 'Mistral Studio',
    group: 'external',
    icon: MISTRAL_AVATAR,
    comingSoon: true,
  },
  {
    id: 'custom-scaffold',
    label: 'Custom scaffold [AI SDK, LangChain]',
    group: 'custom',
    icon: CUSTOM_CODE_AVATAR,
    comingSoon: false,
    runtime: 'scratch',
  },
];

export function getConnectorById(id: ConnectorId | undefined): ConnectorOption | undefined {
  if (!id) return undefined;

  return CONNECTOR_OPTIONS.find((o) => o.id === id);
}
