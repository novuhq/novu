import React from 'react';
import { UnstyledButton, Group, Popover } from '@mantine/core';
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
  testId?: string;
  checked?: boolean;
  switchButton?: (boolean) => void;
  changeTab: (string) => void;
  areThereErrors?: boolean;
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
  testId,
  areThereErrors = false,
}: ITemplateButtonProps) {
  const { cx, classes, theme } = useStyles();
  const disabled = action && !checked;
  const disabledColor = disabled ? { color: theme.colorScheme === 'dark' ? colors.B40 : colors.B70 } : {};
  const disabledProp = disabled ? { disabled } : {};

  return (
    <Popover
      styles={{
        root: {
          width: '100%',
        },
        inner: {
          padding: '12px 15px 14px',
        },
        arrow: {
          backgroundColor: colors.error,
          height: '7px',
          border: 'none',
          margin: '0px',
        },
        body: {
          backgroundColor: colors.error,
          position: 'relative',
          color: colors.white,
          border: 'none',
          marginTop: '-20px',
        },
      }}
      withArrow
      transition="rotate-left"
      transitionDuration={250}
      gutter={theme.spacing.xs}
      opened={!active && areThereErrors}
      mb={20}
      placement="center"
      position="right"
      target={
        <UnstyledButton
          onClick={() => !active && changeTab(tabKey)}
          data-test-id={testId}
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
      }>
      Something is missing here
    </Popover>
  );
}
