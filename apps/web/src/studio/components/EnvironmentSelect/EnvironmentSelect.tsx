import { Select, When } from '@novu/design-system';
import { css } from '@novu/novui/css';
import { navSelectStyles } from '../../../components/nav/NavSelect.styles';
import { EnvironmentPopover } from '../../../components/nav/EnvironmentSelect/EnvironmentPopover';
import { useEnvironmentSelect } from './useEnvironmentSelect';

export const EnvironmentSelectRenderer: React.FC<ReturnType<typeof useEnvironmentSelect>> = ({
  icon,
  isPopoverOpened,
  setIsPopoverOpened,
  handlePopoverLinkClick,
  readonly,
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
        data-test-id="environment-switch"
        allowDeselect={false}
        icon={
          <When truthy={!selectProps.loading}>
            <span
              className={css({
                p: '50',
                borderRadius: '50',
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
