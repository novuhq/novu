import { RiBookOpenLine, RiChat1Line, RiQuestionLine, RiSparklingLine } from 'react-icons/ri';
import { useAiDrawer } from '@/components/ai-drawer';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { Command, CommandExecutionContext } from '../command-types';

export function useHelpCommands(_context: CommandExecutionContext): Command[] {
  const track = useTelemetry();
  const { openAiDrawer } = useAiDrawer();

  const commands: Command[] = [
    {
      id: 'help-docs',
      label: 'Open Documentation',
      description: 'View the Novu documentation',
      category: 'help',
      icon: <RiBookOpenLine />,
      priority: 'medium',
      keywords: ['docs', 'documentation', 'help', 'guide'],
      execute: () => {
        window.open('https://docs.novu.co', '_blank');
      },
    },
    {
      id: 'help-feedback',
      label: 'Share Feedback',
      description: 'Send feedback or get help from our team',
      category: 'help',
      icon: <RiChat1Line />,
      priority: 'medium',
      keywords: ['feedback', 'support', 'help', 'chat'],
      execute: () => {
        track(TelemetryEvent.SHARE_FEEDBACK_LINK_CLICKED);
        try {
          window?.Plain?.open();
        } catch (error) {
          console.error('Error opening Plain chat:', error);
        }
      },
    },

  ];

  if (import.meta.env.VITE_INKEEP_API_KEY) {
    commands.push({
      id: 'help-ai-search',
      label: 'Ask Novu AI',
      description: 'Get instant answers powered by AI',
      category: 'help',
      icon: <RiSparklingLine />,
      priority: 'high',
      keywords: ['ai', 'ask', 'search', 'help', 'question', 'assistant', 'inkeep'],
      execute: () => {
        openAiDrawer();
      },
    });
  }
  return commands;
}
