import { useCallback } from 'react';
import { RiDashboardLine, RiDiscussLine, RiRobot2Line, RiSettings4Line } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Command, CommandExecutionContext } from '../command-types';

export function useConnectNavigationCommands(context: CommandExecutionContext): Command[] {
  const navigate = useNavigate();

  const createNavigationCommand = useCallback(
    (id: string, label: string, route: string, icon: React.ReactNode) => ({
      id,
      label: `Go to ${label}`,
      description: `Navigate to ${label}`,
      category: 'navigation' as const,
      icon,
      priority: 'high' as const,
      keywords: [label.toLowerCase(), 'go', 'navigate', 'connect'],
      execute: () => {
        if (!context.environmentSlug) {
          return;
        }

        navigate(buildRoute(route, { environmentSlug: context.environmentSlug }));
      },
      isVisible: () => !!context.environmentSlug,
    }),
    [navigate, context.environmentSlug]
  );

  return [
    createNavigationCommand('connect-dashboard', 'Dashboard', ROUTES.CONNECT_HOME, <RiDashboardLine />),
    createNavigationCommand('connect-agents', 'Agents', ROUTES.CONNECT_AGENTS, <RiRobot2Line />),
    createNavigationCommand(
      'connect-conversations',
      'Conversations',
      ROUTES.CONNECT_CONVERSATIONS,
      <RiDiscussLine />
    ),
    createNavigationCommand('connect-settings', 'Settings', ROUTES.CONNECT_SETTINGS, <RiSettings4Line />),
  ];
}
