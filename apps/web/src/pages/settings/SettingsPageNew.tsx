import { Center, Loader } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { colors } from '@novu/design-system';

import { useAuthContext } from '../../components/providers/AuthProvider';

export function SettingsPageNew() {
  const { currentOrganization } = useAuthContext();

  if (!currentOrganization) {
    return (
      <Center>
        <Loader color={colors.error} size={32} />
      </Center>
    );
  }

  return <Outlet />;
}
