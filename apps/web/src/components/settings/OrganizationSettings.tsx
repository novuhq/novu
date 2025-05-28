import { OrganizationProfile } from '@clerk/clerk-react';
import { Appearance } from '@clerk/types';
import styled from '@emotion/styled';
import { Stack } from '@mantine/core';
import { Text } from '@novu/design-system';
import { IS_EE_AUTH_ENABLED } from '../../config';
import { useFetchOrganizationSettings } from '../../api/hooks/useFetchOrganizationSettings';
import { useUpdateOrganizationSettings } from '../../api/hooks/useUpdateOrganizationSettings';
import { NovuBrandingSwitch } from './NovuBrandingSwitch';

const SectionTitle = styled(Text)`
  font-size: 20px;
  font-weight: 600;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? '#FFF' : '#1A1A1A')};
  margin-bottom: 16px;
`;

const BrandingSection = styled.div`
  padding-top: 24px;
  margin-top: 24px;
  padding-bottom: 24px;
  margin-bottom: 24px;
`;

const BrandingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const BrandingDescription = styled.div`
  font-size: 12px;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? '#A1A1AA' : '#6B7280')};
`;

export function OrganizationSettings({ clerkAppearance }: { clerkAppearance: Appearance }) {
  const { data: organizationSettings, isLoading: isLoadingSettings } = useFetchOrganizationSettings();
  const { updateSettings, isLoading: isUpdating } = useUpdateOrganizationSettings();

  const handleRemoveBrandingChange = (value: boolean) => {
    updateSettings({
      removeNovuBranding: value,
    });
  };

  const removeNovuBranding = organizationSettings?.data?.removeNovuBranding;

  if (!IS_EE_AUTH_ENABLED) {
    return (
      <OrganizationProfile appearance={clerkAppearance}>
        <OrganizationProfile.Page label="general" />
        <OrganizationProfile.Page label="members" />
      </OrganizationProfile>
    );
  }

  return (
    <Stack spacing={0}>
      {/* Branding Section */}
      <BrandingSection>
        <SectionTitle>Branding & Integrations</SectionTitle>
        <div>
          <BrandingRow>
            <Text size="sm" weight="bold">
              Remove Novu branding
            </Text>
            <NovuBrandingSwitch
              id="remove-branding"
              value={removeNovuBranding}
              onChange={handleRemoveBrandingChange}
              isReadOnly={isLoadingSettings || isUpdating}
            />
          </BrandingRow>
          <BrandingDescription>When enabled, removes Novu branding from your notifications.</BrandingDescription>
        </div>
      </BrandingSection>

      <OrganizationProfile appearance={clerkAppearance}>
        <OrganizationProfile.Page label="general" />
        <OrganizationProfile.Page label="members" />
      </OrganizationProfile>
    </Stack>
  );
}
