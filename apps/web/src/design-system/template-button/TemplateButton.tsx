import React from 'react';
import { UnstyledButton, Group } from '@mantine/core';
import { Text } from '../typography/text/Text';
import { Switch } from '../switch/Switch';
import { useStyles } from './TemplateButton.styles';
import { colors } from '../config';

interface ITemplateButtonProps {
  icon: React.ReactNode;
  description: string;
  label: string;
  active?: boolean;
  action?: boolean;
}

export function TemplateButton({ icon, description, active, action = false, label }: ITemplateButtonProps) {
  const { cx, classes } = useStyles();

  return (
    <UnstyledButton className={cx(classes.button, { [classes.active]: active })}>
      <Group position="apart">
        <Group spacing={15}>
          <div className={classes.linkIcon}>{icon}</div>
          <div>
            <Text weight="bold">{label}</Text>
            <Text mt={3} color={colors.B60}>
              {description}
            </Text>
          </div>
        </Group>
        <div style={{ alignItems: 'end' }}>{action && <Switch />}</div>
      </Group>
    </UnstyledButton>
  );
}
