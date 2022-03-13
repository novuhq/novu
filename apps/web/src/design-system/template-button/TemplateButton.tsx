import React from 'react';
import { UnstyledButton, Group } from '@mantine/core';
import { Text } from '../typography/text/Text';
import { Switch } from '../switch/Switch';
import { useStyles } from './TemplateButton.styles';
import { colors } from '../config';

interface ITemplateButtonProps {
  icon: React.ReactNode;
  iconDisabled?: React.ReactNode;
  description: string;
  label: string;
  active?: boolean;
  action?: boolean;
}

export function TemplateButton({
  icon,
  description,
  active,
  changeTab,
  tabKey,
  action = false,
  switchButton,
  checked = false,
  label,
  iconDisabled,
}: ITemplateButtonProps) {
  const { cx, classes, theme } = useStyles();
  const disabled = action && !checked;
  const disabledColor = disabled ? { color: theme.colorScheme === 'dark' ? colors.B40 : colors.B70 } : {};

  return (
    <UnstyledButton className={cx(classes.button, { [classes.active]: active })}>
      <Group position="apart">
        <Group spacing={15}>
          <div className={classes.linkIcon}>{disabled ? iconDisabled : icon}</div>
          <div>
            <Text {...disabledColor} weight="bold">
              {label}
            </Text>
            <Text mt={3} color={colors.B60} {...disabledColor}>
              {description}
            </Text>
          </div>
        </Group>
        <div style={{ alignItems: 'end' }}>{action && <Switch />}</div>
      </Group>
    </UnstyledButton>
  );
}
