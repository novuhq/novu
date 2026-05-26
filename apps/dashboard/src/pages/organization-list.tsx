import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AutoCreateConnectOrganization } from '@/components/auth/auto-create-connect-organization';
import OrganizationCreate from '@/components/auth/create-organization';
import { PageMeta } from '@/components/page-meta';
import { IS_ENTERPRISE, IS_SELF_HOSTED } from '@/config';
import { consumeConnectProvisionIntentFromLocation, isManualOrgCreationAllowed } from '@/utils/connect';

export const OrganizationListPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (IS_SELF_HOSTED && !IS_ENTERPRISE) {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    if (!isManualOrgCreationAllowed()) {
      consumeConnectProvisionIntentFromLocation();
    }
  }, []);

  if (!isManualOrgCreationAllowed()) {
    return (
      <>
        <PageMeta title="Build and distribute agents" />
        <AutoCreateConnectOrganization />
      </>
    );
  }

  return (
    <>
      <PageMeta title="Select or create organization" />

      <OrganizationCreate />
    </>
  );
};
