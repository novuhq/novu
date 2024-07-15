import { Select, IconConstruction, IconRocketLaunch } from '@novu/design-system';

import { css } from '@novu/novui/css';
import { navSelectStyles } from '../NavSelect.styles';
import { useEnvironment } from '../../../components/providers/EnvironmentProvider';
import { BaseEnvironmentEnum } from '../../../constants/BaseEnvironmentEnum';

export function EnvironmentSelect() {
  const { environment, environments, isLoading, switchEnvironment } = useEnvironment();

  const onChange = async (environmentId) => await switchEnvironment({ environmentId });

  return (
    <Select
      className={navSelectStyles}
      data-test-id="environment-switch"
      allowDeselect={false}
      loading={isLoading}
      value={environment?._id}
      data={(environments || []).map(({ _id: value, name: label }) => ({ label, value }))}
      onChange={onChange}
      icon={
        !isLoading && (
          <span
            className={css({
              p: '50',
              // TODO: use design system values when available
              borderRadius: '8px',
              bg: 'surface.page',
              '& svg': {
                fill: 'typography.text.main',
              },
              _after: {
                width: '100',
              },
            })}
          >
            {environment?.name === BaseEnvironmentEnum.DEVELOPMENT ? <IconConstruction /> : <IconRocketLaunch />}
          </span>
        )
      }
    />
  );
}
