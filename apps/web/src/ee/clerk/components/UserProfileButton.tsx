import { UserButton } from '@clerk/clerk-react';
import { useColorScheme } from '@novu/design-system';
import { Title } from '@novu/novui';
import { IconCreditCard, IconGroup, IconRoomPreferences, IconWorkspacePremium } from '@novu/novui/icons';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { ROUTES } from '../../../constants/routes';
import { useFeatureFlag } from '../../../hooks';
import { BrandingPage } from '../../../pages/brand/BrandingPage';
import { BillingPage } from '../../billing/pages/BillingPage';
import { CustomOrganizationProfile } from './CustomOrganizationProfile';

export function UserProfileButton() {
  const isV2Enabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_ENABLED);
  const { colorScheme } = useColorScheme();
  const headerColor = colorScheme === 'dark' ? 'rgb(255, 255, 255)' : 'rgb(33, 33, 38)';

  return (
    <UserButton afterSignOutUrl={ROUTES.AUTH_LOGIN} userProfileUrl="/manage-account">
      <UserButton.UserProfilePage label="account" />
      <UserButton.UserProfilePage label="security" />
      <UserButton.UserProfilePage label="Organization" url={ROUTES.ORGANIZATION} labelIcon={<IconRoomPreferences />}>
        <CustomOrganizationProfile firstItem="general" />
      </UserButton.UserProfilePage>

      <UserButton.UserProfilePage label="Team members" url={ROUTES.TEAM} labelIcon={<IconGroup />}>
        <CustomOrganizationProfile firstItem="members" />
      </UserButton.UserProfilePage>

      {!isV2Enabled && (
        <UserButton.UserProfilePage label="Branding" url={ROUTES.BRAND_SETTINGS} labelIcon={<IconWorkspacePremium />}>
          <BrandingPage />
        </UserButton.UserProfilePage>
      )}

      <UserButton.UserProfilePage label="Billing plans" url={ROUTES.BILLING} labelIcon={<IconCreditCard />}>
        <Title marginBottom="150" variant="section" color={headerColor}>
          Billing plans
        </Title>
        <BillingPage />
      </UserButton.UserProfilePage>
    </UserButton>
  );
}
