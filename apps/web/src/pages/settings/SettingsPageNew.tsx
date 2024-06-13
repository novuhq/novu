import { Center, Loader } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { colors } from '@novu/design-system';
import { useAuth } from '../../hooks/useAuth';

export function SettingsPageNew() {
  const { currentOrganization } = useAuth();
  if (!currentOrganization) {
    return (
      <Center>
        <Loader color={colors.error} size={32} />
      </Center>
    );
  }

  return <Outlet />;
}
