import { OrganizationList } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import AuthLayout from '../../../components/layout/components/AuthLayout';
import { ROUTES } from '../../../constants/routes';
import { useRedirectURL } from '../../../hooks/useRedirectURL';

export default function OrganizationListPage() {
  const { setRedirectURL } = useRedirectURL();

  useEffect(() => {
    setRedirectURL();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthLayout
      title="Select or create organization"
      description="Please select or create an organization to continue."
    >
      <OrganizationList
        appearance={{
          elements: {
            organizationAvatarUploaderContainer: {
              display: 'none',
            },
          },
        }}
        hidePersonal
        skipInvitationScreen
        afterSelectOrganizationUrl={ROUTES.GET_STARTED}
        afterCreateOrganizationUrl={ROUTES.AUTH_APPLICATION}
      />
    </AuthLayout>
  );
}
