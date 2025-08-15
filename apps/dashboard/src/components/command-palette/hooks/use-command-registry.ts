import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';
import { Command, CommandCategory, CommandExecutionContext, CommandGroup } from '../command-types';
import { useActionCommands } from '../commands/action-commands';
import { useEnvironmentCommands } from '../commands/environment-commands';
import { useHelpCommands } from '../commands/help-commands';
import { useNavigationCommands } from '../commands/navigation-commands';
import { useSettingsCommands } from '../commands/settings-commands';
import { useSubscriberCommands } from '../commands/subscriber-commands';
import { useWorkflowCommands } from '../commands/workflow-commands';
import { useWorkflowEditorCommands } from '../commands/workflow-editor-commands';
import { useWorkflowEditorContext } from './use-workflow-editor-context';

export function useCommandRegistry(searchQuery = ''): CommandGroup[] {
  const location = useLocation();
  const { currentEnvironment } = useEnvironment();
  const workflowEditorContext = useWorkflowEditorContext();

  const context: CommandExecutionContext = {
    currentPath: location.pathname,
    environmentSlug: currentEnvironment?.slug,
    organizationId: currentEnvironment?._organizationId,
    searchQuery,
    workflowContext: workflowEditorContext,
  };

  const actionCommands = useActionCommands(context);
  const navigationCommands = useNavigationCommands(context);
  const workflowCommands = useWorkflowCommands(context);
  const workflowEditorCommands = useWorkflowEditorCommands(context);
  const subscriberCommands = useSubscriberCommands(context);
  const environmentCommands = useEnvironmentCommands(context);
  const settingsCommands = useSettingsCommands(context);
  const helpCommands = useHelpCommands(context);

  const commandGroups = useMemo(() => {
    const allCommands: Command[] = [
      ...actionCommands,
      ...workflowCommands,
      ...workflowEditorCommands,
      ...navigationCommands,
      ...subscriberCommands,
      ...environmentCommands,
      ...settingsCommands,
      ...helpCommands,
    ];

    const visibleCommands = allCommands.filter((command) => (command.isVisible ? command.isVisible() : true));

    const isSearching = searchQuery.trim().length > 0;
    const maxItemsPerCategory = isSearching ? Infinity : 5;

    const groups: CommandGroup[] = [];
    const categoryOrder: CommandCategory[] = [
      'current-workflow',
      'workflow',
      'action',
      'navigation',
      'data',
      'settings',
      'search',
      'help',
    ];
    const availableCategories = Array.from(new Set(visibleCommands.map((cmd) => cmd.category)));

    // Sort categories by predefined order, with any unlisted categories at the end
    const sortedCategories = categoryOrder
      .filter((cat) => availableCategories.includes(cat))
      .concat(availableCategories.filter((cat) => !categoryOrder.includes(cat)));

    for (const category of sortedCategories) {
      const commands = visibleCommands.filter((cmd) => cmd.category === category);
      if (commands.length > 0) {
        const sortedCommands = commands.sort((a, b) => {
          // Sort by priority first, then alphabetically
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const aPriority = priorityOrder[a.priority || 'medium'];
          const bPriority = priorityOrder[b.priority || 'medium'];

          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }

          return a.label.localeCompare(b.label);
        });

        // Limit commands per category when not searching
        const limitedCommands = sortedCommands.slice(0, maxItemsPerCategory);

        groups.push({
          category,
          label: getCategoryLabel(category),
          commands: limitedCommands,
        });
      }
    }

    return groups;
  }, [
    actionCommands,
    navigationCommands,
    workflowCommands,
    workflowEditorCommands,
    subscriberCommands,
    environmentCommands,
    settingsCommands,
    helpCommands,
    searchQuery,
  ]);

  return commandGroups;
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'current-workflow': 'Current Workflow Actions',
    navigation: 'Navigation',
    workflow: 'Workflows',
    data: 'Data',
    action: 'Actions',
    search: 'Search',
    settings: 'Settings',
    help: 'Help & Support',
  };

  return labels[category] || category;
}
