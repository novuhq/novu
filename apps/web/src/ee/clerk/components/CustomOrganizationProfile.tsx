import { OrganizationProfile, useOrganization } from '@clerk/clerk-react';
import { OrganizationProfileTheme } from '@clerk/types';
import { ROUTES } from '../../../constants/routes';

// Hacky workaround to embed organization profile in user profile page
export const CustomOrganizationProfile = ({
  appearance,
  firstItem,
}: {
  appearance: OrganizationProfileTheme;
  firstItem: 'general' | 'members';
}) => {
  const { organization } = useOrganization();

  if (firstItem === 'general') {
    return (
      <OrganizationProfile
        appearance={appearance}
        // @ts-ignore
        __unstable_manageBillingUrl={ROUTES.MANAGE_ACCOUNT_BILLING}
        __unstable_manageBillingMembersLimit={organization?.maxAllowedMemberships}
      >
        <OrganizationProfile.Page label="general" />
        <OrganizationProfile.Page label="members" />
      </OrganizationProfile>
    );
  }

  return (
    <OrganizationProfile
      appearance={appearance}
      // @ts-ignore
      __unstable_manageBillingUrl={ROUTES.MANAGE_ACCOUNT_BILLING}
      __unstable_manageBillingMembersLimit={organization?.maxAllowedMemberships}
    >
      <OrganizationProfile.Page label="members" />
      <OrganizationProfile.Page label="general" />
    </OrganizationProfile>
  );
};
