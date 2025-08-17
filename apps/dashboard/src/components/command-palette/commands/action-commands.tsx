import { LuBookUp2 } from 'react-icons/lu';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment, useFetchEnvironments } from '@/context/environment/hooks';
import { Command, CommandExecutionContext } from '../command-types';

const DEVELOPMENT_ENVIRONMENT = 'Development';

export function useActionCommands(_context: CommandExecutionContext): Command[] {
  const { currentOrganization } = useAuth();
  const { currentEnvironment } = useEnvironment();
  const { environments = [] } = useFetchEnvironments({ organizationId: currentOrganization?._id });

  const commands: Command[] = [];

  // Only show publish command in development environment
  const isDevelopmentEnvironment = currentEnvironment?.name === DEVELOPMENT_ENVIRONMENT;
  const targetEnvironment = environments.find((env) => env._id !== currentEnvironment?._id);

  if (isDevelopmentEnvironment && targetEnvironment) {
    commands.push({
      id: 'action-open-publish-modal',
      label: 'Open publish changes modal',
      description: 'Open the modal to publish changes to production',
      category: 'action',
      icon: <LuBookUp2 />,
      priority: 'high',
      keywords: ['publish', 'changes', 'modal', 'production', 'deploy'],
      execute: () => {
        // Trigger a custom event that the publish button can listen to
        window.dispatchEvent(
          new CustomEvent('open-publish-modal', {
            detail: { targetEnvironment },
          })
        );
      },
      isVisible: () => isDevelopmentEnvironment && !!targetEnvironment,
    });
  }

  return commands;
}
