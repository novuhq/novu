import { ChatProviderIdEnum, EmailProviderIdEnum } from '@novu/shared';
import { AtSign, Hash, Laptop, Mails } from 'lucide-react';
import type { ReactNode } from 'react';
import { AGENT_IMESSAGE_LABEL, getAgentChannelIconFileName } from '@/utils/agent-channel-branding';

/**
 * Answers to the onboarding personalize step. The values are stable identifiers reported to
 * analytics — changing one breaks continuity with previously collected answers, so edit the
 * `label` when copy changes and leave the `value` alone.
 */
export type AgentReadiness = 'live_in_production' | 'in_development' | 'planned_not_started' | 'just_exploring';

export type AgentAudience = 'customers_end_users' | 'employees_internal_teams' | 'both' | 'not_sure_yet';

/** How users and the agent initiate conversations — optional survey answer. */
export type AgentInteraction = 'agent_reaches_out_or_asks' | 'users_message_or_tag' | 'both';

/** Survey channel ids only — real provider ids so they join the rest of the agent funnel. */
export const AGENT_CHANNEL_VALUES = [
  EmailProviderIdEnum.NovuAgent,
  ChatProviderIdEnum.Slack,
  ChatProviderIdEnum.MsTeams,
  ChatProviderIdEnum.WhatsAppBusiness,
  ChatProviderIdEnum.Sendblue,
  ChatProviderIdEnum.Telegram,
  ChatProviderIdEnum.Discord,
  ChatProviderIdEnum.NovuAgentChat,
] as const;

export type AgentChannel = (typeof AGENT_CHANNEL_VALUES)[number];

export type PersonalizeOption<TValue extends string> = {
  value: TValue;
  label: string;
};

export const AGENT_READINESS_OPTIONS: PersonalizeOption<AgentReadiness>[] = [
  { value: 'live_in_production', label: "Yes, it's live in production" },
  { value: 'in_development', label: 'In development' },
  { value: 'planned_not_started', label: 'Planned, but not started' },
  { value: 'just_exploring', label: "I'm just exploring" },
];

export const AGENT_AUDIENCE_OPTIONS: PersonalizeOption<AgentAudience>[] = [
  { value: 'customers_end_users', label: 'Customers or end users' },
  { value: 'employees_internal_teams', label: 'Employees or internal teams' },
  { value: 'both', label: 'Both' },
  { value: 'not_sure_yet', label: "I'm not sure yet" },
];

export type ChannelOption = {
  value: AgentChannel;
  label: string;
  icon: ReactNode;
  /** Brand colour the chip tints itself with while selected. */
  accent: string;
};

const providerIcon = (providerId: AgentChannel) => (
  <img
    src={`/images/providers/light/square/${getAgentChannelIconFileName(providerId)}.svg`}
    alt=""
    className="size-4"
  />
);

export const AGENT_CHANNEL_OPTIONS: ChannelOption[] = [
  {
    // Agent email has no square brand asset — generic glyph, per the design.
    value: EmailProviderIdEnum.NovuAgent,
    label: 'Email',
    icon: <Mails className="size-4" strokeWidth={1.5} />,
    accent: '#525866',
  },
  {
    value: ChatProviderIdEnum.Slack,
    label: 'Slack',
    icon: providerIcon(ChatProviderIdEnum.Slack),
    accent: '#2eb67d',
  },
  {
    value: ChatProviderIdEnum.MsTeams,
    label: 'MS Teams',
    icon: providerIcon(ChatProviderIdEnum.MsTeams),
    accent: '#6264a7',
  },
  {
    value: ChatProviderIdEnum.WhatsAppBusiness,
    label: 'WhatsApp',
    icon: providerIcon(ChatProviderIdEnum.WhatsAppBusiness),
    accent: '#25d366',
  },
  {
    value: ChatProviderIdEnum.Sendblue,
    label: AGENT_IMESSAGE_LABEL,
    icon: providerIcon(ChatProviderIdEnum.Sendblue),
    accent: '#34c759',
  },
  {
    value: ChatProviderIdEnum.Telegram,
    label: 'Telegram',
    icon: providerIcon(ChatProviderIdEnum.Telegram),
    accent: '#229ed9',
  },
  {
    value: ChatProviderIdEnum.Discord,
    label: 'Discord',
    icon: providerIcon(ChatProviderIdEnum.Discord),
    accent: '#5865f2',
  },
  {
    value: ChatProviderIdEnum.NovuAgentChat,
    label: 'Agent Chat',
    icon: providerIcon(ChatProviderIdEnum.NovuAgentChat),
    accent: '#DC224E',
  },
];

export type InteractionOption = {
  value: AgentInteraction;
  label: string;
  icon: ReactNode;
  /** Brand colour the chip tints itself with while selected. */
  accent: string;
};

/** Neutral accent shared by interaction chips (no per-option brand colour). */
const INTERACTION_ACCENT = '#525866';

export const AGENT_INTERACTION_OPTIONS: InteractionOption[] = [
  {
    value: 'agent_reaches_out_or_asks',
    label: 'The agent reaches out or asks for input',
    icon: <Hash className="size-4" strokeWidth={1.5} />,
    accent: INTERACTION_ACCENT,
  },
  {
    value: 'users_message_or_tag',
    label: 'Users message or tag the agent',
    icon: <AtSign className="size-4" strokeWidth={1.5} />,
    accent: INTERACTION_ACCENT,
  },
  {
    value: 'both',
    label: 'Both',
    icon: <Laptop className="size-4" strokeWidth={1.5} />,
    accent: INTERACTION_ACCENT,
  },
];
