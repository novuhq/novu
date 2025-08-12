import { RiBookOpenLine, RiChat1Line, RiQuestionLine } from 'react-icons/ri';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { Command, CommandExecutionContext } from '../command-types';

export function useHelpCommands(_context: CommandExecutionContext): Command[] {
  const track = useTelemetry();

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
    {
      id: 'help-shortcuts',
      label: 'Keyboard Shortcuts',
      description: 'View all available keyboard shortcuts',
      category: 'help',
      icon: <RiQuestionLine />,
      priority: 'low',
      keywords: ['shortcuts', 'keyboard', 'hotkeys', 'commands'],
      execute: () => {
        // TODO: Implement shortcuts modal in later phase
        console.log('Keyboard shortcuts modal coming soon...');
      },
    },
  ];

  return commands;
}
