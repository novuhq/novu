import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import capitalize from 'lodash.capitalize';
import type { IResponseError, IOrganizationEntity } from '@novu/shared';
import { Select, Tooltip, When, successMessage } from '@novu/design-system';
import { css } from '@novu/novui/css';
import { COMPANY_LOGO_PATH } from '../../../constants/assets';
import { arrowStyles, navSelectStyles, tooltipStyles } from '../NavSelect.styles';
import { useAuth } from '../../providers/AuthProvider';
import { addOrganization } from '../../../api/organization';
import { useSpotlightContext } from '../../providers/SpotlightProvider';
import { useOrganizations } from '../../../hooks/useOrganizations';

export function OrganizationSelect() {
  const [canShowTooltip, setCanShowTooltip] = useState<boolean>(false);
  const { isOrganizationLoaded, currentOrganization, switchOrganization } = useAuth();
  const { data: organizations, isLoading: isOrganizationsLoading } = useOrganizations();
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { addItem, removeItems } = useSpotlightContext();

  const { mutateAsync: createOrganization } = useMutation<IOrganizationEntity, IResponseError, string>(
    (name) => addOrganization(name),
    {
      onSuccess: () => {
        successMessage('Your trial has started! 🎉');
      },
    }
  );

  function onCreate(newOrganization: string) {
    (async () => {
      if (!newOrganization) {
        return;
      }

      setIsLoading(true);
      const response = await createOrganization(newOrganization);
      await switchOrganization(response._id);
      setIsLoading(false);
    })();

    /*
     * Necessary hack for Mantine V5 `<Select/>` that doesn't support async `onCreate`
     * See https://v5.mantine.dev/core/select/#creatable
     */
    return '';
  }

  function onChange(organizationId: string | string[] | null) {
    (async () => {
      if (!organizationId) {
        return;
      }

      if (Array.isArray(organizationId)) {
        // eslint-disable-next-line no-param-reassign
        [organizationId] = organizationId;
      }

      setIsLoading(true);
      await switchOrganization(organizationId);
      setIsLoading(false);
    })();
  }

  const value = currentOrganization?._id || '';

  const data = useMemo(() => {
    return (organizations || []).map((item) => ({
      label: capitalize(item.name),
      value: item._id,
    }));
  }, [organizations]);

  useEffect(() => {
    removeItems([`change-org-${value}`]);
    addItem(
      (organizations || [])
        .filter((item) => item._id !== value)
        .map((item) => ({
          id: `change-org-${item._id}`,
          title: `Change org to ${capitalize(item.name)}`,
          onTrigger: () => switchOrganization(item._id),
        }))
    );
  }, [organizations, switchOrganization, addItem, removeItems, value]);

  return (
    <Tooltip
      label="Type a name to add organization"
      sx={{ visibility: canShowTooltip && !isLoading ? 'visible' : 'hidden' }}
      position="left"
      classNames={{
        tooltip: tooltipStyles,
        arrow: arrowStyles,
      }}
      withinPortal
    >
      <Select
        data-test-id="organization-switch"
        className={navSelectStyles}
        creatable
        searchable
        loading={isLoading || isOrganizationsLoading || !isOrganizationLoaded}
        getCreateLabel={(newOrganization) => <div>+ Add "{newOrganization}"</div>}
        value={value}
        onCreate={onCreate}
        onChange={onChange}
        allowDeselect={false}
        onSearchChange={setSearch}
        onDropdownOpen={() => {
          setCanShowTooltip(true);
        }}
        onDropdownClose={() => {
          setCanShowTooltip(false);
        }}
        data={data}
        icon={
          <When truthy={!isLoading}>
            <img
              // TODO: use actual organization photo
              src={COMPANY_LOGO_PATH}
              className={css({
                w: '200',
                h: '200',
                // TODO: use design system values when available
                borderRadius: '8px',
              })}
            />
          </When>
        }
      />
    </Tooltip>
  );
}
