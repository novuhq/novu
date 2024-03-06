import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as capitalize from 'lodash.capitalize';
import styled from '@emotion/styled';
import type { IResponseError, IOrganizationEntity } from '@novu/shared';

import { Select } from '@novu/design-system';
import { addOrganization, switchOrganization } from '../../../api/organization';
import { useAuthContext } from '../../providers/AuthProvider';
import { useSpotlightContext } from '../../providers/SpotlightProvider';

export default function OrganizationSelect() {
  const [value, setValue] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loadingSwitch, setLoadingSwitch] = useState<boolean>(false);
  const { addItem, removeItems } = useSpotlightContext();

  const queryClient = useQueryClient();
  const { currentOrganization, organizations, setToken } = useAuthContext();

  const { isLoading: loadingAddOrganization, mutateAsync: createOrganization } = useMutation<
    IOrganizationEntity,
    IResponseError,
    string
  >((name) => addOrganization(name));

  const { mutateAsync: changeOrganization } = useMutation<string, IResponseError, string>((id) =>
    switchOrganization(id)
  );

  const switchOrgCallback = useCallback(
    async (organizationId: string | string[] | null) => {
      if (
        Array.isArray(organizationId) ||
        !organizationId ||
        organizationId === currentOrganization?._id ||
        organizationId === search
      ) {
        return;
      }

      setLoadingSwitch(true);
      const token = await changeOrganization(organizationId);
      setToken(token);
      await queryClient.refetchQueries();
      setLoadingSwitch(false);
    },
    [currentOrganization, search, setToken, changeOrganization, queryClient]
  );

  function addOrganizationItem(newOrganization: string): undefined {
    if (!newOrganization) return;

    createOrganization(newOrganization).then((response) => {
      return switchOrgCallback(response._id);
    });
  }

  const organizationItems = useMemo(() => {
    return (organizations || [])
      .filter((item) => item._id !== value)
      .map((item) => ({
        id: 'change-org-' + item._id,
        title: 'Change org to ' + capitalize(item.name),
        onTrigger: () => {
          switchOrgCallback(item._id);
        },
      }));
  }, [organizations, value, switchOrgCallback]);

  useEffect(() => {
    setValue(currentOrganization?._id || '');
  }, [currentOrganization]);

  useEffect(() => {
    removeItems(['change-org-' + value]);

    addItem(organizationItems);
  }, [addItem, removeItems, organizationItems, value]);

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
          onChange={switchOrgCallback}
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
  margin-top: 16px;

  input {
    background: transparent;
  }
`;
