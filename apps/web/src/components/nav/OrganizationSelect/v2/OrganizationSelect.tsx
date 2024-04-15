import { Select, Tooltip, When } from '@novu/design-system';
import { useState } from 'react';
import { COMPANY_LOGO_PATH } from '../../../../constants/assets';
import { css } from '../../../../styled-system/css';
import { arrowStyles, navSelectStyles, tooltipStyles } from '../../NavSelect.styles';
import { useOrganizationSelect } from '../useOrganizationSelect';

interface INavOrganizationSelectRendererProps {
  loadingAddOrganization: boolean;
  loadingSwitch: boolean;
  addOrganizationItem: (newOrganization: string) => undefined;
  value: string;
  switchOrgCallback: (organizationId: string | string[] | null) => Promise<void>;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  data: {
    label: string;
    value: string;
  }[];
}

export const OrganizationSelectRenderer: React.FC<INavOrganizationSelectRendererProps> = ({
  loadingAddOrganization,
  loadingSwitch,
  addOrganizationItem,
  value,
  switchOrgCallback,
  setSearch,
  data,
}) => {
  const [canShowTooltip, setCanShowTooltip] = useState<boolean>(false);

  const isLoading = loadingAddOrganization || loadingSwitch;

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
        loading={isLoading}
        getCreateLabel={(newOrganization) => <div>+ Add "{newOrganization}"</div>}
        onCreate={addOrganizationItem}
        value={value}
        onChange={switchOrgCallback}
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
};

export const OrganizationSelect = () => {
  return <OrganizationSelectRenderer {...useOrganizationSelect()} />;
};
