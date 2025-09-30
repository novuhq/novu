import { PageMeta } from '@/components/page-meta';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrganizationCreate from '../components/auth/create-organization';
import { IS_ENTERPRISE, IS_SELF_HOSTED } from '../config';

export const OrganizationListPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (IS_SELF_HOSTED && !IS_ENTERPRISE) {
      navigate('/');
    }
  }, [navigate]);

  return (
    <>
      <PageMeta title="Select or create organization" />

      <OrganizationCreate />
    </>
  );
};
