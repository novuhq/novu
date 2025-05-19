import { PageMeta } from '@/components/page-meta';
import OrganizationCreate from '../components/auth/create-organization';
import { IS_SELF_HOSTED } from '../config';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const OrganizationListPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (IS_SELF_HOSTED) {
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
