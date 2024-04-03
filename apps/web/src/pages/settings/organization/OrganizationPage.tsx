import { PageContainer } from '@novu/design-system';
import { useAuthContext } from '@novu/shared-web';
import PageHeader from '../../../components/layout/components/PageHeader';
import { css } from '../../../styled-system/css';
import { HStack } from '../../../styled-system/jsx';
import { OrganizationLogo } from './OrganizationLogo';
import { OrganizationName } from './OrganizationName';

const PAGE_TITLE = 'Organization profile';

export function OrganizationPage() {
  const { currentOrganization } = useAuthContext();

  return (
    <PageContainer title={PAGE_TITLE}>
      <PageHeader title={PAGE_TITLE} />

      <div className={css({ p: 24 })}>
        <HStack gap={24} alignItems="flex-end" h={72}>
          <OrganizationLogo logo={currentOrganization?.branding?.logo} />
          <OrganizationName organizationName={currentOrganization?.name} />
        </HStack>
      </div>
    </PageContainer>
  );
}
