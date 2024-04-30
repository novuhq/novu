import { IconAdminPanelSettings } from '@novu/design-system';
import { FC } from 'react';
import { ProductLead } from '../../components/utils/ProductLead';
import { SettingsPageContainer } from './SettingsPageContainer';

export const AccessSecurityPage: FC = () => {
  return (
    <SettingsPageContainer title={'Access security'}>
      <ProductLead
        icon={<IconAdminPanelSettings size="24" color="typography.text.secondary" />}
        id="rbac-permissions"
        title="Role-based access control"
        text="Securely manage users' permissions to access system resources."
        closeable={false}
      />
    </SettingsPageContainer>
  );
};
