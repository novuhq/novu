import { PermissionsEnum } from '@novu/shared';
import { useCallback } from 'react';
import {
  RiBarChartBoxLine,
  RiDatabase2Line,
  RiDiscussLine,
  RiGroup2Line,
  RiKey2Line,
  RiLayout5Line,
  RiRouteFill,
  RiSettings4Line,
  RiSignalTowerLine,
  RiTranslate2,
} from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { IS_ENTERPRISE, IS_SELF_HOSTED } from '@/config';
import { useHasPermission } from '@/hooks/use-has-permission';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Command, CommandExecutionContext } from '../command-types';

export function useNavigationCommands(context: CommandExecutionContext): Command[] {
  const navigate = useNavigate();
  const hasPermission = useHasPermission();
  const hasWorkflowPermission = hasPermission({ permission: PermissionsEnum.WORKFLOW_READ });
  const hasSubscriberPermission = hasPermission({ permission: PermissionsEnum.SUBSCRIBER_READ });
  const isEnterprise = !IS_SELF_HOSTED || IS_ENTERPRISE;

  const createNavigationCommand = useCallback(
    (id: string, label: string, route: string, icon: React.ReactNode, permission?: () => boolean) => ({
      id,
      label: `Go to ${label}`,
      description: `Navigate to the ${label.toLowerCase()} page`,
      category: 'navigation' as const,
      icon,
      priority: 'high' as const,
      keywords: [label.toLowerCase(), 'go', 'navigate'],
      execute: () => {
        const finalRoute = route.includes(':environmentSlug')
          ? buildRoute(route, { environmentSlug: context.environmentSlug || '' })
          : route;
        navigate(finalRoute);
      },
      isVisible: permission || (() => true),
    }),
    [navigate, context.environmentSlug]
  );

  const commands: Command[] = [];

  // Core navigation commands
  if (hasWorkflowPermission) {
    commands.push(
      createNavigationCommand(
        'nav-workflows',
        'Workflows',
        ROUTES.WORKFLOWS,
        <RiRouteFill />,
        () => hasWorkflowPermission
      )
    );
  }

  if (hasSubscriberPermission) {
    commands.push(
      createNavigationCommand(
        'nav-subscribers',
        'Subscribers',
        ROUTES.SUBSCRIBERS,
        <RiGroup2Line />,
        () => hasSubscriberPermission
      )
    );
  }

  // Activity navigation
  commands.push(
    createNavigationCommand('nav-activity', 'Activity', ROUTES.ACTIVITY_WORKFLOW_RUNS, <RiBarChartBoxLine />)
  );

  // Integrations
  commands.push(
    createNavigationCommand('nav-integrations', 'Integrations', ROUTES.INTEGRATIONS, <RiSignalTowerLine />)
  );

  // API Keys
  commands.push(createNavigationCommand('nav-api-keys', 'API Keys', ROUTES.API_KEYS, <RiKey2Line />));

  // Settings
  commands.push(createNavigationCommand('nav-settings', 'Settings', ROUTES.SETTINGS, <RiSettings4Line />));

  // Topics
  commands.push(createNavigationCommand('nav-topics', 'Topics', ROUTES.TOPICS, <RiDiscussLine />));

  // Environments
  commands.push(createNavigationCommand('nav-environments', 'Environments', ROUTES.ENVIRONMENTS, <RiDatabase2Line />));

  // Layouts
  commands.push(createNavigationCommand('nav-layouts', 'Email Layouts', ROUTES.LAYOUTS, <RiLayout5Line />));

  if (isEnterprise) {
    commands.push(
      createNavigationCommand(
        'nav-translations',
        'Translations',
        ROUTES.TRANSLATIONS,
        <RiTranslate2 />,
        () => isEnterprise
      )
    );
  }

  return commands;
}
