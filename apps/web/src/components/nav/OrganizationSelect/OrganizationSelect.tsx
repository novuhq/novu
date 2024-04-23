import { Select } from '@novu/design-system';
import { css } from '../../../styled-system/css';
import { useOrganizationSelect } from './useOrganizationSelect';

interface IOrganizationSelectRendererProps {
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

export const OrganizationSelectRenderer: React.FC<IOrganizationSelectRendererProps> = ({
  loadingAddOrganization,
  loadingSwitch,
  addOrganizationItem,
  value,
  switchOrgCallback,
  setSearch,
  data,
}) => {
  return (
    <Select
      className={css({ mt: '100', '& input': { bg: 'transparent' } })}
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
      data={data}
    />
  );
};

/**
 * @deprecated
 */
export default function OrganizationSelect() {
  return <OrganizationSelectRenderer {...useOrganizationSelect()} />;
}
