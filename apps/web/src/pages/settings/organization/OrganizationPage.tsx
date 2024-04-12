import { useAuthContext } from '@novu/shared-web';
import { CONTEXT_PATH } from '../../../config';
import { Stack } from '../../../styled-system/jsx';
import { SettingsPageContainer } from '../SettingsPageContainer';
import { OrganizationLogo } from './OrganizationLogo';
import { OrganizationName } from './OrganizationName';

const PAGE_TITLE = 'Organization profile';

/**
 *TODO: Once organization logo api is implemented
 * update this to use the org logo
 */
const LOGO = CONTEXT_PATH + '/static/images/novu.svg';

export function OrganizationPage() {
  const { currentOrganization } = useAuthContext();

  return (
    <SettingsPageContainer title={PAGE_TITLE}>
      <Stack gap={150} direction="row" h={'4.5rem'} align="flex-end">
        {/**TODO: Once organization logo api is implemented update this to use the org logo */}
        <OrganizationLogo logoUrl={LOGO} />
        <OrganizationName organizationName={currentOrganization?.name} />
      </Stack>
    </SettingsPageContainer>
  );
}
