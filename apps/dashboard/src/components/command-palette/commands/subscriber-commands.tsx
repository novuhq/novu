import { PermissionsEnum } from '@novu/shared';
import { RiDiscussLine, RiUserAddLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { useHasPermission } from '@/hooks/use-has-permission';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Command, CommandExecutionContext } from '../command-types';

export function useSubscriberCommands(context: CommandExecutionContext): Command[] {
  const navigate = useNavigate();
  const hasPermission = useHasPermission();
  const hasSubscriberWrite = hasPermission({ permission: PermissionsEnum.SUBSCRIBER_WRITE });

  const commands: Command[] = [];

  if (hasSubscriberWrite && context.environmentSlug) {
    // Create new subscriber
    commands.push({
      id: 'subscriber-create',
      label: 'Create New Subscriber',
      description: 'Add a new subscriber to your environment',
      category: 'data',
      icon: <RiUserAddLine />,
      priority: 'high',
      keywords: ['create', 'new', 'subscriber', 'add', 'user'],
      execute: () => {
        if (context.environmentSlug) {
          navigate(buildRoute(ROUTES.CREATE_SUBSCRIBER, { environmentSlug: context.environmentSlug }));
        }
      },
      isVisible: () => hasSubscriberWrite && !!context.environmentSlug,
    });

    // Create new topic
    commands.push({
      id: 'topic-create',
      label: 'Create New Topic',
      description: 'Create a new topic for subscriber management',
      category: 'data',
      icon: <RiDiscussLine />,
      priority: 'medium',
      keywords: ['create', 'new', 'topic', 'add'],
      execute: () => {
        if (context.environmentSlug) {
          navigate(buildRoute(ROUTES.TOPICS_CREATE, { environmentSlug: context.environmentSlug }));
        }
      },
      isVisible: () => hasSubscriberWrite && !!context.environmentSlug,
    });
  }

  return commands;
}
