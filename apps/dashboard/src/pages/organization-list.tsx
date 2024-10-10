import { OrganizationList as OrganizationListForm } from '@clerk/clerk-react';
import { PageMeta } from '@/components/page-meta';
import { ROUTES } from '@/utils/routes';

export const OrganizationListPage = () => {
  return (
    <>
      <PageMeta title="Select or create organization" />
      <OrganizationListForm
        appearance={{
          elements: {
            organizationAvatarUploaderContainer: {
              display: 'none',
            },
          },
        }}
        hidePersonal
        skipInvitationScreen
        afterSelectOrganizationUrl={ROUTES.ENV}
        afterCreateOrganizationUrl={ROUTES.ENV}
      />
    </>
  );
};
