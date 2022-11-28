import { colors } from '../../../../design-system';

export const VarItem = ({ name, type, children = null }: { name: string; type: string; children?: any }) => {
  return (
    <div
      style={{
        marginBottom: 10,
        padding: 10,
        borderRadius: 7,
        background: colors.B20,
        color: colors.B60,
      }}
    >
      "{name}":"{type}"{children}
    </div>
  );
};
