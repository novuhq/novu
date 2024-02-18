import { useMantineTheme, Highlight } from '@mantine/core';
import { colors } from '@novu/design-system';

export const VarItem = ({
  name,
  type,
  children = null,
  highlight = '',
}: {
  name: string;
  type: string;
  children?: React.ReactNode;
  highlight?: string;
}) => {
  const theme = useMantineTheme();

  return (
    <div
      data-test-id={`var-item-${name}-${type}`}
      style={{
        marginBottom: 10,
        padding: 8,
        color: colors.B60,
        width: '100%',
      }}
    >
      <Highlight span inline highlight={highlight}>
        {name}
      </Highlight>

      <pre
        style={{
          display: 'inline',
          marginLeft: 5,
          background: theme.colorScheme === 'dark' ? colors.B15 : colors.B98,
          padding: 5,
          borderRadius: 8,
        }}
      >
        {type}
      </pre>
      {children}
    </div>
  );
};
