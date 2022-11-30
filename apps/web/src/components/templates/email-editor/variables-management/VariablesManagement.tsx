import { Button, colors, Tooltip, Text } from '../../../../design-system';
import { useFormContext, useWatch } from 'react-hook-form';
import { SystemVariablesWithTypes } from '@novu/shared';
import { VarItem } from './VarItem';
import { VarItemsDropdown } from './VarItemsDropdown';
import { VarLabel } from './VarLabel';
import { UnstyledButton, useMantineTheme } from '@mantine/core';
import { Edit } from '../../../../design-system/icons';
import { GlobeGradient } from '../../../../design-system/icons/gradient/GlobeGradient';
import { EditGradient } from '../../../../design-system/icons/gradient/EditGradient';

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
          textAlign: 'right',
          marginBottom: '20px',
        }}
      >
        <UnstyledButton
          onClick={() => {
            openVariablesModal();
          }}
          type="button"
        >
          <Tooltip label="Add defaults or mark as required">
            <Text gradient>
              Edit Variables
              <EditGradient
                style={{
                  width: '18px',
                  height: '18px',
                  marginBottom: '-4px',
                  marginLeft: 5,
                }}
              />
            </Text>
          </Tooltip>
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
