import { useAuthContext } from '@novu/shared-web';
import { Stack } from '../../../styled-system/jsx';
import { SettingsPageContainer } from '../SettingsPageContainer';
import { OrganizationLogo } from './OrganizationLogo';
import { OrganizationName } from './OrganizationName';

const PAGE_TITLE = 'Organization profile';

export function OrganizationPage() {
  const { currentOrganization } = useAuthContext();

  return (
    <SettingsPageContainer title={PAGE_TITLE}>
      <Stack gap={150} direction="row" h={72} align="flex-end">
        <OrganizationLogo logoUrl={currentOrganization?.branding?.logo} />
        <OrganizationName organizationName={currentOrganization?.name} />
      </Stack>
    </SettingsPageContainer>
  );
}
