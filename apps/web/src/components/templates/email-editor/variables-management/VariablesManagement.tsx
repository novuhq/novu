import { colors, Text } from '../../../../design-system';
import { useFormContext, useWatch } from 'react-hook-form';
import { SystemVariablesWithTypes } from '@novu/shared';
import { VarItem } from './VarItem';
import { VarItemsDropdown } from './VarItemsDropdown';
import { VarLabel } from './VarLabel';
import { UnstyledButton, useMantineTheme } from '@mantine/core';
import { getGradient } from '../../../../design-system/config/helper';

export const VariablesManagement = ({ index, openVariablesModal }) => {
  const { control } = useFormContext();
  const theme = useMantineTheme();
  const variableArray = useWatch({
    name: `steps.${index}.template.variables`,
    control,
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: theme.colorScheme === 'dark' ? colors.B17 : colors.B98,
        borderRadius: 7,
        padding: 15,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          marginBottom: '20px',
        }}
      >
        <UnstyledButton
          onClick={() => {
            openVariablesModal();
          }}
          type="button"
          sx={{
            borderBottom: '1px solid transparent',
            background: `${
              theme.colorScheme === 'dark' ? getGradient(colors.B17) : getGradient(colors.B98)
            } padding-box, ${colors.horizontal} border-box`,
            paddingBottom: '2px',
          }}
        >
          <Text gradient>Add defaults or mark as required</Text>
        </UnstyledButton>
      </div>
      <VarLabel label="System Variables">
        {Object.keys(SystemVariablesWithTypes).map((name) => {
          const type = SystemVariablesWithTypes[name];

          if (typeof type === 'object') {
            return <VarItemsDropdown name={name} type={type} />;
          }

          return <VarItem name={name} type={type} />;
        })}
      </VarLabel>
      <div
        style={{
          marginTop: '20px',
        }}
      >
        <VarLabel label="Step Variables">
          {variableArray.map((item) => {
            return <VarItem name={item.name} type={item.type.toLowerCase()} />;
          })}
        </VarLabel>
      </div>
    </div>
  );
};
