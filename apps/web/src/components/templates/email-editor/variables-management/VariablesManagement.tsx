import { colors, Text, Tooltip } from '../../../../design-system';
import { useFormContext, useWatch } from 'react-hook-form';
import { SystemVariablesWithTypes } from '@novu/shared';
import { VarItem } from './VarItem';
import { VarItemsDropdown } from './VarItemsDropdown';
import { VarLabel } from './VarLabel';
import { UnstyledButton, useMantineTheme } from '@mantine/core';
import { EditGradient } from '../../../../design-system/icons/gradient/EditGradient';
import { useProcessVariables } from '../../../../hooks/use-process-variables';

export const VariablesManagement = ({ index, openVariablesModal }) => {
  const { control } = useFormContext();
  const theme = useMantineTheme();
  const variableArray = useWatch({
    name: `steps.${index}.template.variables`,
    control,
  });
  const processedVariables = useProcessVariables(variableArray, false);

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
        <Tooltip label="Add defaults or mark as required">
          <UnstyledButton
            onClick={() => {
              openVariablesModal();
            }}
            type="button"
          >
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
          </UnstyledButton>
        </Tooltip>
      </div>
      <VarLabel label="System Variables">
        {Object.keys(SystemVariablesWithTypes).map((name, ind) => {
          const type = SystemVariablesWithTypes[name];

          if (typeof type === 'object') {
            return <VarItemsDropdown name={name} key={ind} type={type} />;
          }

          return <VarItem name={name} key={ind} type={type} />;
        })}
      </VarLabel>
      <div
        style={{
          marginTop: '20px',
        }}
      >
        <VarLabel label="Step Variables">
          {Object.keys(processedVariables).map((name, ind) => {
            if (typeof processedVariables[name] === 'object') {
              return <VarItemsDropdown key={ind} name={name} type={processedVariables[name]} />;
            }

            return <VarItem key={ind} name={name} type={typeof processedVariables[name]} />;
          })}
        </VarLabel>
      </div>
    </div>
  );
};
