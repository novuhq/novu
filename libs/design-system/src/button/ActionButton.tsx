import React, { MouseEventHandler, FunctionComponent, ReactNode } from 'react';
import { ActionIcon, Center, Sx } from '@mantine/core';

import { Tooltip, ITooltipProps } from '../tooltip/Tooltip';
import { Text } from '../typography/text/Text';
import { colors } from '../config';

export const ActionButton = React.forwardRef<
  HTMLButtonElement,
  {
    tooltip?: ReactNode;
    tooltipPosition?: ITooltipProps['position'];
    text?: string;
    color?: string;
    Icon: FunctionComponent<{ color?: string; width?: string; height?: string }>;
    style?: React.CSSProperties;
    sx?: Sx;
    onClick?: MouseEventHandler<HTMLButtonElement>;
  }
>(({ tooltip, tooltipPosition, text, Icon, style, color, sx, onClick, ...rest }, ref) => {
  const pickedColor = color ?? colors.B60;

  const actionButton = (
    <ActionIcon
      ref={ref}
      sx={(theme) => ({
        minWidth: 28,
        width: 'initial',
        padding: '0 4px',
        border: 'none',
        '&:hover': {
          background: theme.colorScheme === 'dark' ? colors.B30 : colors.B98,
          borderRadius: '8px',
          '> svg': {
            color: theme.colorScheme === 'dark' ? colors.white : colors.B60,
          },
        },
        ...sx,
      })}
      onClick={onClick}
      style={style}
      {...rest}
    >
      {text ? (
        <Center inline>
          <Icon color={pickedColor} width="20px" height="20px" />
          <Text color={pickedColor} weight={'bold'} ml={4} size={14}>
            {text}
          </Text>
        </Center>
      ) : (
        <Icon color={pickedColor} width="20px" height="20px" />
      )}
    </ActionIcon>
  );

  if (!tooltip) {
    return actionButton;
  }

  return (
    <Tooltip label={tooltip} position={tooltipPosition}>
      {actionButton}
    </Tooltip>
  );
});
