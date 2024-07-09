import { OrganizationSwitcher as ClerkOrganizationSwitcher } from '@clerk/clerk-react';
import { token } from '@novu/novui/tokens';

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
  return <ClerkOrganizationSwitcher hidePersonal appearance={OrganizationSwitcherAppearance} />;
}
