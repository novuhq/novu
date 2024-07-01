import { OrganizationSwitcher as ClerkOrganizationSwitcher } from '@clerk/clerk-react';

// TODO: this is tmp. styling
const OrganizationSwitcherAppearance = {
  elements: {
    organizationSwitcherTrigger: {
      paddingInline: 'var(--nv-spacing-125)',
      fontSize: '14px',
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
