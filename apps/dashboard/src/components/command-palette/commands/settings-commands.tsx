import { RiDatabase2Line, RiMoneyDollarCircleLine, RiSettings4Line, RiUserAddLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/routes';
import { Command, CommandExecutionContext } from '../command-types';

export function useSettingsCommands(_context: CommandExecutionContext): Command[] {
  const navigate = useNavigate();

  const commands: Command[] = [
    {
      id: 'settings-account',
      label: 'Account Settings',
      description: 'Manage your account preferences',
      category: 'settings',
      icon: <RiSettings4Line />,
      priority: 'medium',
      keywords: ['account', 'profile', 'settings'],
      execute: () => navigate(ROUTES.SETTINGS_ACCOUNT),
    },
    {
      id: 'settings-organization',
      label: 'Organization Settings',
      description: 'Manage organization settings and preferences',
      category: 'settings',
      icon: <RiDatabase2Line />,
      priority: 'medium',
      keywords: ['organization', 'org', 'settings'],
      execute: () => navigate(ROUTES.SETTINGS_ORGANIZATION),
    },
    {
      id: 'settings-team',
      label: 'Team Settings',
      description: 'Manage team members and permissions',
      category: 'settings',
      icon: <RiUserAddLine />,
      priority: 'medium',
      keywords: ['team', 'members', 'invite', 'settings'],
      execute: () => navigate(ROUTES.SETTINGS_TEAM),
    },
    {
      id: 'settings-billing',
      label: 'Billing Settings',
      description: 'Manage billing and subscription settings',
      category: 'settings',
      icon: <RiMoneyDollarCircleLine />,
      priority: 'medium',
      keywords: ['billing', 'subscription', 'payment', 'invoice', 'settings'],
      execute: () => navigate(ROUTES.SETTINGS_BILLING),
    },
  ];

  return commands;
}
