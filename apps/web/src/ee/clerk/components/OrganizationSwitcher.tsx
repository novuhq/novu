import { OrganizationSwitcher as ClerkOrganizationSwitcher } from '@clerk/clerk-react';
import { token } from '@novu/novui/tokens';
import { ROUTES } from '../../../constants/routes';

const OrganizationSwitcherAppearance = {
  elements: {
    organizationSwitcherTrigger: {
      paddingInline: token('spacing.125'),
      width: '240px',
      height: '52px',
      justifyContent: 'space-between',
      color: 'var(--nv-colors-typography-text-secondary) !important',
      '&:hover, &:focus, &:active': {
        color: 'var(--nv-colors-typography-text-main) !important',
      },
    },
    organizationSwitcherPopoverActionButton__manageOrganization: {
      display: 'none',
    },
    organizationPreviewMainIdentifier: {
      fontFamily: 'var(--nv-fonts-system)',
      fontWeight: 'var(--nv-font-weights-strong)',
      fontSize: 'var(--nv-font-sizes-88)',
    },
  },
};

export function OrganizationSwitcher() {
  const redirectUrl = window.location.pathname.includes('workflows/edit') ? ROUTES.WORKFLOWS : undefined;

  return (
    <ClerkOrganizationSwitcher
      hidePersonal
      appearance={OrganizationSwitcherAppearance}
      afterSelectOrganizationUrl={redirectUrl}
    />
  );
}
