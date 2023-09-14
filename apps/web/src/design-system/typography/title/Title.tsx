import { MantineColor, Title as MantineTitle, useMantineTheme } from '@mantine/core';
import { colors } from '../../config';
import { SpacingProps } from '../../shared/spacing.props';

interface ITitleProps extends JSX.ElementChildrenAttribute, SpacingProps {
  size?: 1 | 2;
  color?: MantineColor;
}
/**
 * Use Title to create headers.
 *
 */
export function Title({ size = 1, children, ...props }: ITitleProps) {
  const { colorScheme } = useMantineTheme();

  let textColor = props.color;
  if (!textColor) {
    textColor = colorScheme === 'dark' ? colors.white : colors.B40;
  }

  return (
    <MantineTitle
      sx={{
        fontWeight: size === 1 ? 800 : 700,
      }}
      order={size}
      color={textColor}
      {...props}
    >
      {children}
    </MantineTitle>
  );
}
