import { colors, Text, Tooltip } from '../../../../design-system';
import { useFormContext, useWatch } from 'react-hook-form';
import { SystemVariablesWithTypes } from '@novu/shared';
import { VarItem } from './VarItem';
import { VarItemsDropdown } from './VarItemsDropdown';
import { VarLabel } from './VarLabel';
import { ActionIcon, UnstyledButton, useMantineTheme } from '@mantine/core';
import { EditGradient } from '../../../../design-system/icons/gradient/EditGradient';
import { useProcessVariables } from '../../../../hooks/use-process-variables';
import { useClipboard } from '@mantine/hooks';
import { Check, Copy } from '../../../../design-system/icons';
import { useState } from 'react';

export const VariablesManagement = ({ index, openVariablesModal }) => {
  const [copiedVariable, setCopiedVariable] = useState<number | null>(null);
  const { control } = useFormContext();
  const { copy } = useClipboard();
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

          return (
            <Tooltip data-test-id={'Tooltip'} label={ind === copiedVariable ? 'Copied!' : 'Copy key'} key={ind}>
              <ActionIcon
                variant="transparent"
                onClick={() => {
                  setCopiedVariable(ind);
                  copy(`${name}`);
                  setTimeout(() => setCopiedVariable(null), 500);
                }}
                sx={{ width: '100%', height: 'unset', minWidth: 'unset', minHeight: 'unset', lineHeight: '1.15' }}
              >
                <VarItem key={ind} name={name} type={type}>
                  <span style={{ position: 'absolute', right: '2%', bottom: ind === copiedVariable ? '40%' : '20%' }}>
                    {ind === copiedVariable ? <Check /> : <Copy />}
                  </span>
                </VarItem>
              </ActionIcon>
            </Tooltip>
          );
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

            return (
              <Tooltip data-test-id={'Tooltip'} label={ind === copiedVariable ? 'Copied!' : 'Copy key'} key={ind}>
                <ActionIcon
                  variant="transparent"
                  onClick={() => {
                    setCopiedVariable(ind);
                    copy(`${name}`);
                    setTimeout(() => setCopiedVariable(null), 500);
                  }}
                  sx={{ width: '100%', height: 'unset', minWidth: 'unset', minHeight: 'unset', lineHeight: '1.15' }}
                >
                  <VarItem key={ind} name={name} type={typeof processedVariables[name]}>
                    <span style={{ position: 'absolute', right: '2%', bottom: ind === copiedVariable ? '40%' : '20%' }}>
                      {ind === copiedVariable ? <Check /> : <Copy />}
                    </span>
                  </VarItem>
                </ActionIcon>
              </Tooltip>
            );
          })}
        </VarLabel>
      </div>
    </div>
  );
};
