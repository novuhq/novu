import { Stack } from '@novu/novui/jsx';
import { useAuth } from '../../../hooks/useAuth';
import { COMPANY_LOGO_PATH } from '../../../constants/assets';
import { SettingsPageContainer } from '../SettingsPageContainer';
import { OrganizationLogo } from './OrganizationLogo';
import { OrganizationName } from './OrganizationName';

const PAGE_TITLE = 'Organization profile';

export function OrganizationPage() {
  const { currentOrganization } = useAuth();

  return (
    <SettingsPageContainer title={PAGE_TITLE}>
      <Stack gap={150} direction="row" h={'4.5rem'} align="flex-end">
        {/* TODO: Once organization logo api is implemented update this to use the org logo */}
        <OrganizationLogo logoUrl={COMPANY_LOGO_PATH} />
        <OrganizationName name={currentOrganization?.name} />
      </Stack>
    </SettingsPageContainer>
  );
}
