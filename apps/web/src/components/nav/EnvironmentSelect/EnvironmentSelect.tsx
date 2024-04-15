import { Select, When } from '@novu/design-system';
import { css } from '../../../styled-system/css';
import { navSelectStyles } from '../NavSelect.styles';
import { EnvironmentPopover } from './EnvironmentPopover';
import { useEnvironmentSelect } from './useEnvironmentSelect';

export const EnvironmentSelectRenderer: React.FC<ReturnType<typeof useEnvironmentSelect>> = ({
  icon,
  isPopoverOpened,
  setIsPopoverOpened,
  handlePopoverLinkClick,
  ...selectProps
}) => {
  return (
    <EnvironmentPopover
      isPopoverOpened={isPopoverOpened}
      setIsPopoverOpened={setIsPopoverOpened}
      handlePopoverLinkClick={handlePopoverLinkClick}
    >
      <Select
        className={navSelectStyles}
        allowDeselect={false}
        icon={
          <When truthy={!selectProps.loading}>
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
              {icon}
            </span>
          </When>
        }
        {...selectProps}
      />
    </EnvironmentPopover>
  );
};

export const EnvironmentSelect = () => {
  const props = useEnvironmentSelect();

  return <EnvironmentSelectRenderer {...props} />;
};
