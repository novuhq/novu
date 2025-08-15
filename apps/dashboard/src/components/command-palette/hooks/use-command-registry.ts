import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';
import { Command, CommandExecutionContext, CommandGroup } from '../command-types';
import { useActionCommands } from '../commands/action-commands';
import { useEnvironmentCommands } from '../commands/environment-commands';
import { useHelpCommands } from '../commands/help-commands';
import { useNavigationCommands } from '../commands/navigation-commands';
import { useSettingsCommands } from '../commands/settings-commands';
import { useSubscriberCommands } from '../commands/subscriber-commands';
import { useWorkflowCommands } from '../commands/workflow-commands';

export function useCommandRegistry(searchQuery = ''): CommandGroup[] {
  const location = useLocation();
  const { currentEnvironment } = useEnvironment();

  const context: CommandExecutionContext = {
    currentPath: location.pathname,
    environmentSlug: currentEnvironment?.slug,
    organizationId: currentEnvironment?._organizationId,
    searchQuery,
  };

  // Get commands from different categories
  const actionCommands = useActionCommands(context);
  const navigationCommands = useNavigationCommands(context);
  const workflowCommands = useWorkflowCommands(context);
  const subscriberCommands = useSubscriberCommands(context);
  const environmentCommands = useEnvironmentCommands(context);
  const settingsCommands = useSettingsCommands(context);
  const helpCommands = useHelpCommands(context);

  const commandGroups = useMemo(() => {
    const allCommands: Command[] = [
      ...actionCommands,
      ...workflowCommands,
      ...navigationCommands,
      ...subscriberCommands,
      ...environmentCommands,
      ...settingsCommands,
      ...helpCommands,
    ];

    // Filter visible commands
    const visibleCommands = allCommands.filter((command) => (command.isVisible ? command.isVisible() : true));

    // Group commands by category
    const groups: CommandGroup[] = [];
    const categories = Array.from(new Set(visibleCommands.map((cmd) => cmd.category)));

    for (const category of categories) {
      const commands = visibleCommands.filter((cmd) => cmd.category === category);
      if (commands.length > 0) {
        groups.push({
          category,
          label: getCategoryLabel(category),
          commands: commands.sort((a, b) => {
            // Sort by priority first, then alphabetically
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            const aPriority = priorityOrder[a.priority || 'medium'];
            const bPriority = priorityOrder[b.priority || 'medium'];

            if (aPriority !== bPriority) {
              return aPriority - bPriority;
            }

            return a.label.localeCompare(b.label);
          }),
        });
      }
    }

    return groups;
  }, [
    actionCommands,
    navigationCommands,
    workflowCommands,
    subscriberCommands,
    environmentCommands,
    settingsCommands,
    helpCommands,
  ]);

  return commandGroups;
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    navigation: 'Navigation',
    workflow: 'Workflows',
    subscriber: 'Subscribers',
    action: 'Actions',
    search: 'Search',
    settings: 'Settings',
    help: 'Help & Support',
  };

  return labels[category] || category;
}
