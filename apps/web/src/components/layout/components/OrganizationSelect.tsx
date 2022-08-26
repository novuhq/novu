import { useContext, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import * as capitalize from 'lodash.capitalize';
import styled from 'styled-components';
import { useMantineColorScheme } from '@mantine/core';
import { IOrganizationEntity } from '@novu/shared';
import { colors, Select, shadows } from '../../../design-system';
import { addOrganization, switchOrganization } from '../../../api/organization';
import { AuthContext } from '../../../store/authContext';

export default function OrganizationSelect() {
  const [value, setValue] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loadingSwitch, setLoadingSwitch] = useState<boolean>(false);

  const queryClient = useQueryClient();
  const { currentOrganization, organizations, setToken } = useContext(AuthContext);
  const { colorScheme } = useMantineColorScheme();

  const { isLoading: loadingAddOrganization, mutateAsync: createOrganization } = useMutation<
    IOrganizationEntity,
    { error: string; message: string; statusCode: number },
    string
  >((name) => addOrganization(name));

  const { mutateAsync: changeOrganization } = useMutation<
    string,
    { error: string; message: string; statusCode: number },
    string
  >((name) => switchOrganization(name));

  async function addOrganizationItem(newOrganization: string) {
    if (!newOrganization) return;

    const response = await createOrganization(newOrganization);
    switchOrg(response._id);
  }

  async function switchOrg(organizationId: string | string[] | null) {
    if (!organizationId || organizationId === currentOrganization?._id || organizationId === search) {
      return;
    }

    setLoadingSwitch(true);

    const token = await changeOrganization(organizationId as string);
    setToken(token);
    await queryClient.refetchQueries();

    setLoadingSwitch(false);
  }

  useEffect(() => {
    setValue(currentOrganization?._id || '');
  }, [currentOrganization]);

  return (
    <>
      <SelectWrapper dark={colorScheme === 'dark'}>
        <Select
          data-test-id="organization-switch"
          loading={loadingAddOrganization || loadingSwitch}
          creatable
          searchable
          getCreateLabel={(newOrganization) => <div>+ Add "{newOrganization}"</div>}
          onCreate={addOrganizationItem}
          value={value}
          onChange={switchOrg}
          allowDeselect={false}
          onSearchChange={setSearch}
          data={(organizations || []).map((item) => ({
            label: capitalize(item.name),
            value: item._id,
          }))}
        />
      </SelectWrapper>
    </>
  );
}

const SelectWrapper = styled.div<{ dark: boolean }>`
  input {
    border: 0;
    border-radius: 9999px;
    background: ${({ dark }) => (dark ? colors.B15 : colors.white)};
    box-shadow: ${({ dark }) => (dark ? shadows.dark : shadows.light)};
  }
`;
