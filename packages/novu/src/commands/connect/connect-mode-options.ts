import type { AgentConnectMode } from './types';

export type ConnectModeOption = {
  value: AgentConnectMode;
  title: string;
  detail?: string;
};

export type ConnectModeGroup = {
  heading: string;
  options: readonly ConnectModeOption[];
};

export const CONNECT_MODE_GROUPS: readonly ConnectModeGroup[] = [
  {
    heading: 'Custom code',
    options: [
      { value: 'ai-sdk', title: 'AI SDK' },
      { value: 'langchain', title: 'LangChain' },
      { value: 'custom-code', title: 'Custom code' },
      { value: 'chat-sdk', title: 'Chat SDK' },
    ],
  },
  {
    heading: 'Managed agent runtimes',
    options: [
      { value: 'claude', title: 'Claude Managed Agent' },
      { value: 'claude-aws', title: 'AWS Claude Managed Agent' },
    ],
  },
  {
    heading: "Don't have an agent yet?",
    options: [{ value: 'demo', title: 'Try a demo agent', detail: '10 conversations per month' }],
  },
];

export const CONNECT_MODE_PICKER_TITLE = 'Where your agent runs?';

export const CONNECT_MODE_PICKER_SUBTITLE =
  'The platform or framework that hosts and runs your agent today. Novu supports both custom-code and managed-runtime agents.';

export function flattenConnectModeOptions(): ConnectModeOption[] {
  return CONNECT_MODE_GROUPS.flatMap((group) => group.options);
}
