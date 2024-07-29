import { OrganizationSwitcher as ClerkOrganizationSwitcher } from '@clerk/clerk-react';
import { token } from '@novu/novui/tokens';
import { ROUTES } from '../../../constants/routes';

// TODO: this is tmp. styling
const OrganizationSwitcherAppearance = {
  elements: {
    organizationSwitcherTrigger: {
      paddingInline: token('spacing.125'),
      width: '240px',
      height: '52px',
      justifyContent: 'space-between',
    },
    organizationSwitcherPopoverActionButton__manageOrganization: {
      display: 'none',
    },
  },
};

export function OrganizationSwitcher() {
  const redirectUrl = location.pathname.includes('workflows/edit') ? ROUTES.WORKFLOWS : undefined;

  return (
    <ClerkOrganizationSwitcher
      hidePersonal
      appearance={OrganizationSwitcherAppearance}
      afterSelectOrganizationUrl={redirectUrl}
    />
  );
}
