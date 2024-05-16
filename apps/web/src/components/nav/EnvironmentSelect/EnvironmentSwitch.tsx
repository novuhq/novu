import { Switch, SwitchProps } from '@mantine/core';
import { IconLabel, Select, When, Tooltip } from '@novu/design-system';
import { BaseEnvironmentEnum } from '@novu/shared-web';
import { useEffect } from 'react';
import { useHover } from '../../../hooks';
import { css, cva } from '../../../styled-system/css';
import { styled } from '../../../styled-system/jsx';
import { text } from '../../../styled-system/recipes';
import { SystemStyleObject } from '../../../styled-system/types';
import { navSelectStyles } from '../NavSelect.styles';
import { EnvironmentPopover } from './EnvironmentPopover';
import { useEnvironmentSelect } from './useEnvironmentSelect';

const SwitchLabel = styled('span', text, {
  defaultProps: {
    className: css({ textTransform: 'uppercase', fontFamily: 'mono', fontWeight: 'bold', fontSize: '75' }),
  },
});

const iconRecipe = cva<{ env: Record<BaseEnvironmentEnum, SystemStyleObject> }>({
  base: {
    '& svg': { fill: 'typography.text.secondary !important', color: 'typography.text.secondary !important' },
  },

  variants: {
    env: {
      [BaseEnvironmentEnum.PRODUCTION]: {
        '& svg': { fill: 'legacy.white !important', color: 'legacy.white !important' },
      },
      [BaseEnvironmentEnum.DEVELOPMENT]: {
        '& svg': { fill: 'typography.text.secondary !important', color: 'typography.text.secondary !important' },
      },
    },
  },
});

const IconWrapper = styled('span', iconRecipe);

const switchTrackRecipe = cva<{ env: Record<BaseEnvironmentEnum, SystemStyleObject> }>({
  variants: {
    env: {
      [BaseEnvironmentEnum.PRODUCTION]: { bgGradient: 'horizontal' },
      [BaseEnvironmentEnum.DEVELOPMENT]: { bg: 'surface.popover' },
    },
  },
});

export const EnvironmentSwitchRenderer: React.FC<ReturnType<typeof useEnvironmentSelect>> = ({
  isPopoverOpened,
  setIsPopoverOpened,
  handlePopoverLinkClick,
  loading,
  onChange,
  icon,
  value,
}) => {
  const handleChange: SwitchProps['onChange'] = (event) => {
    const newVal = event.currentTarget.checked ? BaseEnvironmentEnum.PRODUCTION : BaseEnvironmentEnum.DEVELOPMENT;
    onChange(newVal);
  };

  return (
    /*
     * <EnvironmentPopover
     *   isPopoverOpened={isPopoverOpened}
     *   setIsPopoverOpened={setIsPopoverOpened}
     *   handlePopoverLinkClick={handlePopoverLinkClick}
     *   position="bottom"
     * >
     */
    <Tooltip label={`Environment: ${value}`} position="bottom">
      <div>
        <Switch
          size="md"
          checked={value === BaseEnvironmentEnum.PRODUCTION}
          offLabel={<IconWrapper env={value as BaseEnvironmentEnum}>{icon}</IconWrapper>}
          onLabel={<IconWrapper env={value as BaseEnvironmentEnum}>{icon}</IconWrapper>}
          onChange={handleChange}
          disabled={loading}
          className={iconRecipe({ env: value as BaseEnvironmentEnum })}
          // className={css({ '& svg': { fill: 'legacy.white !important', color: 'legacy.white !important' } })}
          classNames={{
            track: switchTrackRecipe({ env: value as BaseEnvironmentEnum }),
            // thumb: css({ bg: 'surface.page !important', borderColor: 'surface.page !important' }),
          }}
        />
      </div>
    </Tooltip>
    // </EnvironmentPopover>
  );
};

export const EnvironmentSwitch = () => {
  const props = useEnvironmentSelect();

  return <EnvironmentSwitchRenderer {...props} />;
};
