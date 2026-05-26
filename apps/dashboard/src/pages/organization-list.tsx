import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AutoCreateConnectOrganization } from '@/components/auth/auto-create-connect-organization';
import OrganizationCreate from '@/components/auth/create-organization';
import { PageMeta } from '@/components/page-meta';
import { IS_ENTERPRISE, IS_NOVU_CONNECT, IS_SELF_HOSTED } from '@/config';
import { consumeConnectProvisionIntentFromLocation, hasConnectProvisionIntent } from '@/utils/connect';

export const OrganizationListPage = () => {
  const navigate = useNavigate();

  // Snapshot the provisioning intent ONCE on first render so the page doesn't flip from
  // `AutoCreateConnectOrganization` to the picker mid-flow when the auto-create flow clears
  // the session flag (and vice versa). Subsequent route mounts get the new value.
  const [shouldAutoProvisionConnect] = useState<boolean>(() => IS_NOVU_CONNECT && hasConnectProvisionIntent());

  useEffect(() => {
    if (IS_SELF_HOSTED && !IS_ENTERPRISE) {
      void navigate('/');
    }
  }, [navigate]);

  // Promote the `?provision=1` URL hint to the same-origin sessionStorage flag so child
  // components (e.g. `AutoCreateConnectOrganization`) read a consistent value.
  useEffect(() => {
    if (shouldAutoProvisionConnect) {
      consumeConnectProvisionIntentFromLocation();
    }
  }, [shouldAutoProvisionConnect]);

  // Connect host with explicit provisioning intent (post-sign-up, modal CTA from Platform):
  // auto-create or auto-switch the user's Connect workspace.
  if (shouldAutoProvisionConnect) {
    return (
      <>
        <PageMeta title="Build and distribute agents" />
        <AutoCreateConnectOrganization />
      </>
    );
  }

  // Default path — including Connect after a delete/leave, manual nav from Platform's app rail
  // with existing Connect orgs, or any Platform visit — renders the regular picker. The picker
  // filters memberships by product so Connect users only see Connect orgs and vice versa.
  return (
    <>
      <PageMeta title="Select or create organization" />
      <OrganizationCreate />
    </>
  );
};
