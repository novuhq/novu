import { Button, colors, Tooltip, Text } from '../../../../design-system';
import { useFormContext, useWatch } from 'react-hook-form';
import { SystemVariablesWithTypes } from '@novu/shared';
import { VarItem } from './VarItem';
import { VarItemsDropdown } from './VarItemsDropdown';
import { VarLabel } from './VarLabel';
import { UnstyledButton } from '@mantine/core';

export const VariablesManagement = ({ index, openVariablesModal }) => {
  const { control } = useFormContext();
  const variableArray = useWatch({
    name: `steps.${index}.template.variables`,
    control,
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: colors.B17,
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
        >
          <Text
            sx={{
              textDecoration: 'underline',
            }}
            gradient
          >
            Add defaults or mark as required
          </Text>
        </UnstyledButton>
      </div>
      <VarLabel label="System Vars">
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
        <VarLabel label="Step Vars">
          {variableArray.map((item) => {
            return <VarItem name={item.name} type={item.type.toLowerCase()} />;
          })}
        </VarLabel>
      </div>
    </div>
  );
};
