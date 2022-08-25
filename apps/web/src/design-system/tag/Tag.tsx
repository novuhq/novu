import { Badge } from '@mantine/core';

interface ITagProps extends JSX.ElementChildrenAttribute {
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
        color: theme.colorScheme === 'dark' ? theme.white : theme.colors.gray[8],
        borderColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[5],
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
