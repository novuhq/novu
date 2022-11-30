import { useContext, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import * as capitalize from 'lodash.capitalize';
import styled from '@emotion/styled';
import { IOrganizationEntity } from '@novu/shared';

import { Select } from '../../../design-system';
import { addOrganization, switchOrganization } from '../../../api/organization';
import { AuthContext } from '../../../store/authContext';
import { SpotlightContext } from '../../../store/spotlightContext';

export default function OrganizationSelect() {
  const [value, setValue] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loadingSwitch, setLoadingSwitch] = useState<boolean>(false);
  const { addItem, removeItem } = useContext(SpotlightContext);

  const queryClient = useQueryClient();
  const { currentOrganization, organizations, setToken } = useContext(AuthContext);

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

  function addOrganizationItem(newOrganization: string): undefined {
    if (!newOrganization) return;

    createOrganization(newOrganization).then((response) => {
      return switchOrg(response._id);
    });
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

  useEffect(() => {
    addItem(
      (organizations || [])
        .filter((item) => item._id !== value)
        .map((item) => ({
          id: 'change-org-' + item._id,
          title: 'Change org to ' + capitalize(item.name),
          onTrigger: () => {
            switchOrg(item._id);
          },
        }))
    );
    removeItem('change-org-' + value);
  }, [value]);

  return (
    <>
      <SelectWrapper>
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

const SelectWrapper = styled.div`
  input {
    background: transparent;
  }
`;
