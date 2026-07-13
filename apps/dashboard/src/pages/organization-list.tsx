import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrganizationCreate from '@/components/auth/create-organization';
import { PageMeta } from '@/components/page-meta';
import { IS_SELF_HOSTED_CE } from '@/config';

export const OrganizationListPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (IS_SELF_HOSTED_CE) {
      void navigate('/');
    }
  }, [navigate]);

  return (
    <>
      <PageMeta title="Select or create organization" />
      <OrganizationCreate />
    </>
  );
};
