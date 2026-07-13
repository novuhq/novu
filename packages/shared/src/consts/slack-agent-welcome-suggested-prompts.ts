export type SlackAgentSuggestedPrompt = {
  title: string;
  message: string;
};

export const SLACK_AGENT_WELCOME_SUGGESTED_PROMPTS_TITLE = 'Try asking';

export const SLACK_AGENT_WELCOME_SUGGESTED_PROMPTS: SlackAgentSuggestedPrompt[] = [
  {
    title: 'Say hello',
    message: 'Hello!',
  },
  {
    title: 'What can you do?',
    message: 'What can you help me with?',
  },
  {
    title: 'Get started',
    message: 'How do I get started with this agent?',
  },
];
