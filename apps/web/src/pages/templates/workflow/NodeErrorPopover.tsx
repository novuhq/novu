import styled from '@emotion/styled';
import { createStyles, Group, GroupProps, Popover as MPopover, PopoverProps, useMantineTheme } from '@mantine/core';
import React from 'react';
import { colors, shadows, Text } from '@novu/design-system';

type NodeErrorPopoverProps = {
  target: React.ReactNode;
  titleIcon?: React.ReactNode;
  title: React.ReactNode;
  content: string;
  actionItem?: React.ReactNode;
  actionItemPosition?: GroupProps['position'];
} & Omit<PopoverProps, 'children'>;

export function NodeErrorPopover({
  target,
  title,
  content,
  actionItem,
  titleIcon,
  actionItemPosition = 'right',
  ...rest
}: NodeErrorPopoverProps) {
  const { classes } = useStyles();
  const { colorScheme } = useMantineTheme();

  return (
    <MPopover
      classNames={classes}
      withArrow
      position="right"
      radius="md"
      shadow={colorScheme === 'dark' ? shadows.dark : shadows.medium}
      offset={30}
      middlewares={{ flip: false, shift: false }}
      {...rest}
    >
      <MPopover.Target>{target}</MPopover.Target>
      <MPopover.Dropdown onClick={(e) => e.stopPropagation()}>
        <Group noWrap spacing={8}>
          {titleIcon && <div>{titleIcon}</div>}
          <Label color={colors.error}>{title}</Label>
        </Group>
        <div>
          <Text color={colors.error}>{content}</Text>

          {actionItem && (
            <Group position={actionItemPosition} mt={16}>
              {actionItem}
            </Group>
          )}
        </div>
      </MPopover.Dropdown>
    </MPopover>
  );
}

const useStyles = createStyles((theme) => ({
  dropdown: {
    padding: '16px',
    color: colors.error,
    border: 'none',
    maxWidth: '300px',
    background: theme.colorScheme === 'dark' ? `${colors.errorGradient}, ${colors.B17}` : colors.white,
  },
  arrow: {
    width: '7px',
    height: '7px',
    margin: '0px',
    background: theme.colorScheme === 'dark' ? `${colors.errorGradient}, ${colors.B17}` : colors.white,
  },
}));

const Label = styled.div`
  font-family: 'Lato', serif;
  font-style: normal;
  font-weight: 700;
  font-size: 16px;
  line-height: 20px;
  display: flex;
  align-items: center;
  color: ${colors.error};
  margin-bottom: 10px;
`;
