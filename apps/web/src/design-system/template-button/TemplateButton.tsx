import React from 'react';
import { UnstyledButton, Group } from '@mantine/core';
import { Text } from '../typography/text/Text';
import { Switch } from '../switch/Switch';
import { useStyles } from './TemplateButton.styles';
import { colors } from '../config';

interface ITemplateButtonProps {
  Icon: React.FC<any>;
  description: string;
  label: string;
  active?: boolean;
  action?: boolean;
  tabKey: string;
  checked?: boolean;
  switchButton?: (boolean) => void;
  changeTab: (string) => void;
}

export function TemplateButton({
  description,
  active,
  changeTab,
  tabKey,
  action = false,
  switchButton,
  checked = false,
  label,
  Icon,
}: ITemplateButtonProps) {
  const { cx, classes, theme } = useStyles();
  const disabled = action && !checked;
  const disabledColor = disabled ? { color: theme.colorScheme === 'dark' ? colors.B40 : colors.B70 } : {};
  const disabledProp = disabled ? { disabled } : {};

  return (
    <UnstyledButton
      onClick={() => !active && changeTab(tabKey)}
      className={cx(classes.button, { [classes.active]: active })}>
      <Group position="apart">
        <Group spacing={15}>
          <div className={classes.linkIcon}>
            <Icon {...disabledProp} />
          </div>
          <div>
            <Text {...disabledColor} weight="bold">
              {label}
            </Text>
            <Text mt={3} color={colors.B60} {...disabledColor}>
              {description}
            </Text>
          </div>
        </Group>
        <div style={{ alignItems: 'end' }}>
          {action && <Switch checked={checked} onChange={(e) => switchButton && switchButton(e.target.checked)} />}
        </div>
      </Group>
    </UnstyledButton>
  );
}
