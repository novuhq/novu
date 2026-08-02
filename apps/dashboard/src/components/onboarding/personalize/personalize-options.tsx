import { ChatProviderIdEnum, EmailProviderIdEnum } from '@novu/shared';
import { Laptop, Mails } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Answers to the onboarding personalize step. The values are stable identifiers reported to
 * analytics — changing one breaks continuity with previously collected answers, so edit the
 * `label` when copy changes and leave the `value` alone.
 */
export type AgentReadiness = 'live_in_production' | 'in_development' | 'planned_not_started' | 'just_exploring';

export type AgentAudience = 'customers_end_users' | 'employees_internal_teams' | 'both' | 'not_sure_yet';

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
  /** Real provider id, so this answer joins against the rest of the agent funnel. */
  value: string;
  label: string;
  icon: ReactNode;
  /** Brand colour the chip tints itself with while selected. */
  accent: string;
};

const providerIcon = (file: string) => (
  <img src={`/images/providers/light/square/${file}.svg`} alt="" className="size-4" />
);

export const AGENT_CHANNEL_OPTIONS: ChannelOption[] = [
  {
    value: EmailProviderIdEnum.NovuAgent,
    label: 'Email',
    icon: <Mails className="size-4" strokeWidth={1.5} />,
    accent: '#525866',
  },
  {
    value: ChatProviderIdEnum.Slack,
    label: 'Slack',
    icon: providerIcon('slack'),
    accent: '#2eb67d',
  },
  {
    value: ChatProviderIdEnum.MsTeams,
    label: 'MS Teams',
    icon: providerIcon('msteams'),
    accent: '#6264a7',
  },
  {
    value: ChatProviderIdEnum.WhatsAppBusiness,
    label: 'WhatsApp',
    icon: providerIcon('whatsapp-business'),
    accent: '#25d366',
  },
  {
    // Sendblue is branded as iMessage on user-facing surfaces, matching the channel carousel.
    value: ChatProviderIdEnum.Sendblue,
    label: 'iMessage',
    icon: providerIcon('imessages'),
    accent: '#34c759',
  },
  {
    value: ChatProviderIdEnum.Telegram,
    label: 'Telegram',
    icon: providerIcon('telegram'),
    accent: '#229ed9',
  },
  {
    value: ChatProviderIdEnum.Discord,
    label: 'Discord',
    icon: providerIcon('discord'),
    accent: '#5865f2',
  },
  {
    value: ChatProviderIdEnum.NovuWebChat,
    label: 'In app',
    icon: <Laptop className="size-4" strokeWidth={1.5} />,
    accent: '#525866',
  },
];
