import { useMantineTheme } from '@mantine/core';
import { colors } from '../../../../design-system';

export const VarItem = ({ name, type, children = null }: { name: string; type: string; children?: any }) => {
  const theme = useMantineTheme();

  return (
    <div
      style={{
        marginBottom: 10,
        padding: 10,
        borderRadius: 7,
        background: theme.colorScheme === 'dark' ? colors.B20 : colors.BGLight,
        color: colors.B60,
      }}
    >
      {name}:
      <pre
        style={{
          display: 'inline',
          marginLeft: 5,
          background: theme.colorScheme === 'dark' ? colors.B17 : colors.B98,
          padding: 5,
          borderRadius: 7,
        }}
      >
        {type}
      </pre>
      {children}
    </div>
  );
};
