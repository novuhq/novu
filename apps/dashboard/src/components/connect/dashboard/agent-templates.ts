import { IconType } from 'react-icons';
import { RiUserAddLine } from 'react-icons/ri';
import { BotIcon } from '@/components/icons/bot';

export type AgentTemplate = {
  label: string;
  name: string;
  instructions: string;
  suggestedMcpServers: string[];
};

export type WhatsNextTemplate = {
  id: string;
  label: string;
  icon: IconType;
};

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    label: 'Customer Support',
    name: 'Customer Support Agent',
    instructions:
      'You are a helpful customer support assistant. Answer questions clearly and concisely, and escalate complex issues when needed.',
    suggestedMcpServers: [],
  },
  {
    label: 'DevOps Buddy',
    name: 'DevOps Buddy',
    instructions:
      'You are a DevOps assistant. Help with CI/CD pipelines, infrastructure troubleshooting, and deployment best practices.',
    suggestedMcpServers: [],
  },
  {
    label: 'Code Reviewer',
    name: 'Code Reviewer',
    instructions:
      'You are a senior code reviewer. Provide constructive feedback on code quality, security, and maintainability.',
    suggestedMcpServers: [],
  },
  {
    label: 'Docs Helper',
    name: 'Docs Helper',
    instructions:
      'You are a documentation assistant. Help users find information, clarify concepts, and cite sources accurately.',
    suggestedMcpServers: [],
  },
];

export const WHATS_NEXT: WhatsNextTemplate[] = [
  {
    id: 'invite',
    label: 'Invite teammates',
    icon: RiUserAddLine,
  },
  {
    id: 'agent',
    label: 'Set up new agent',
    icon: BotIcon,
  },
];
