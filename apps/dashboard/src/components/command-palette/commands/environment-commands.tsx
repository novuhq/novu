import { RiDatabase2Line, RiGlobalLine } from 'react-icons/ri';
import { useEnvironment } from '@/context/environment/hooks';
import { Command, CommandExecutionContext } from '../command-types';

export function useEnvironmentCommands(_context: CommandExecutionContext): Command[] {
  const { currentEnvironment, environments, switchEnvironment } = useEnvironment();

  const commands: Command[] = [];

  // Only show environment switching if there are multiple environments
  if (environments && environments.length > 1) {
    for (const environment of environments) {
      // Skip the current environment
      if (environment.slug === currentEnvironment?.slug) {
        continue;
      }

      commands.push({
        id: `env-switch-${environment.slug}`,
        label: `Switch to ${environment.name}`,
        description: `Switch to the ${environment.name} environment`,
        category: 'action',
        icon: environment.name === 'Production' ? <RiGlobalLine /> : <RiDatabase2Line />,
        priority: 'high',
        keywords: ['environment', 'switch', environment.name.toLowerCase(), 'env'],
        execute: () => {
          switchEnvironment(environment.slug);
        },
        isVisible: () => environment.slug !== currentEnvironment?.slug,
      });
    }
  }

  return commands;
}
