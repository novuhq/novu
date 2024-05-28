import { Badge } from '@mantine/core';
import { ComponentFoundationProps } from '../types/ComponentFoundationProps';
import { colors } from '../config';

interface ITagProps extends ComponentFoundationProps {
  color?: string;
  border?: string;
  ml?: number;
  mr?: number;
}

/**
 * Tag Component
 *
 */
export function Tag({ children, color, border, ...props }: ITagProps) {
  return (
    <Badge
      sx={(theme) => ({
        color: theme.colorScheme === 'dark' ? theme.white : colors.B40,
        border: `1px solid ${colors.B30}`,
        borderRadius: '5px',
        textTransform: 'none',
        backgroundColor: 'transparent',
        height: '30px',
        padding: '10px',
        fontSize: '14px',
        fontWeight: 400,
      })}
      variant="outline"
      size="md"
      radius="xs"
      {...props}
    >
      {children}
    </Badge>
  );
}
