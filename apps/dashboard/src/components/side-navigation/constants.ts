import {
  RiBarChartBoxLine,
  RiGroup2Line,
  RiKey2Line,
  RiPaintBrushLine,
  RiRouteFill,
  RiSettings4Line,
  RiStore3Line,
  RiUserAddLine,
} from 'react-icons/ri';
import { NavItemsGroup } from './types';
import { LEGACY_ROUTES, ROUTES } from '@/utils/routes';

export const navigationItems: NavItemsGroup[] = [
  {
    items: [
      {
        label: 'Workflows',
        icon: RiRouteFill,
        to: ROUTES.WORKFLOWS,
      },
      {
        label: 'Subscribers',
        icon: RiGroup2Line,
        disabled: true,
      },
    ],
  },
  {
    label: 'Monitor',
    items: [
      {
        label: 'Activity Feed',
        icon: RiBarChartBoxLine,
        to: LEGACY_ROUTES.ACTIVITY_FEED,
        isExternal: true,
      },
    ],
  },
  {
    label: 'Developer',
    items: [
      {
        label: 'Integration Store',
        icon: RiStore3Line,
        to: LEGACY_ROUTES.INTEGRATIONS,
        isExternal: true,
      },
      {
        label: 'API Keys',
        icon: RiKey2Line,
        to: LEGACY_ROUTES.API_KEYS,
        isExternal: true,
      },
    ],
  },
  {
    label: 'Application',
    items: [
      {
        label: 'Branding',
        icon: RiPaintBrushLine,
        to: LEGACY_ROUTES.BRANDING,
        isExternal: true,
      },
      {
        label: 'Settings',
        icon: RiSettings4Line,
        to: LEGACY_ROUTES.SETTINGS,
        isExternal: true,
      },
    ],
  },
  {
    items: [
      {
        label: 'Invite teammates',
        icon: RiUserAddLine,
        to: LEGACY_ROUTES.INVITE_TEAM_MEMBERS,
        isExternal: true,
      },
    ],
  },
];
