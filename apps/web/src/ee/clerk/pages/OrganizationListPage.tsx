import { OrganizationList } from '@clerk/clerk-react';
import AuthLayout from '../../../components/layout/components/AuthLayout';
import { ROUTES } from '../../../constants/routes';

export default function OrganizationListPage() {
  return (
    <AuthLayout
      title="Select or create organization"
      description="Please select or create an organization to continue."
    >
      <OrganizationList
        hidePersonal
        afterSelectOrganizationUrl={ROUTES.GET_STARTED}
        afterCreateOrganizationUrl={ROUTES.AUTH_APPLICATION}
      />
    </AuthLayout>
  );
}
