import { OrganizationProfile } from '@clerk/clerk-react';
import { FC } from 'react';

// Hides OrganizationProfile sidebar + makes it fit the parent container
const OrganizationProfileAppearance = {
  elements: {
    pageScrollBox: {
      padding: 0,
    },
    cardBox: {
      display: 'block',
      width: '100%',
      height: '100%',
      boxShadow: 'none',
    },
    navbar: {
      display: 'none',
    },
    rootBox: {
      width: '100%',
    },
  },
};

interface CustomOrganizationProfileProps {
  firstItem: 'general' | 'members';
}

// Hacky workaround to embed organization profile in user profile page
export const CustomOrganizationProfile: FC<CustomOrganizationProfileProps> = ({ firstItem }) => {
  if (firstItem === 'general') {
    return (
      <OrganizationProfile appearance={OrganizationProfileAppearance}>
        <OrganizationProfile.Page label="general" />
        <OrganizationProfile.Page label="members" />
      </OrganizationProfile>
    );
  }

  return (
    <OrganizationProfile appearance={OrganizationProfileAppearance}>
      <OrganizationProfile.Page label="members" />
      <OrganizationProfile.Page label="general" />
    </OrganizationProfile>
  );
};
