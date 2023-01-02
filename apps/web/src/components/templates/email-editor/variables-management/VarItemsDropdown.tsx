import { useState } from 'react';
import { ActionIcon, Collapse, Tooltip, UnstyledButton, useMantineTheme } from '@mantine/core';
import { ChevronUp } from '../../../../design-system/icons';
import { ChevronDown } from '../../../../design-system/icons';
import { VarItem } from './VarItem';
import { colors } from '../../../../design-system';
import { useClipboard } from '@mantine/hooks';
import { Check, Copy } from '../../../../design-system/icons';

export const VarItemsDropdown = ({ name, type }) => {
  const [open, setOpen] = useState(false);
  const idClipboard = useClipboard({ timeout: 500 });
  const theme = useMantineTheme();

  return (
    <>
      <UnstyledButton
        data-test-id={`var-items-${name}`}
        onClick={() => {
          setOpen(!open);
        }}
        type="button"
        sx={{
          width: '100%',
        }}
      >
        <VarItem name={name} type="object">
          <span
            style={{
              float: 'right',
            }}
          >
            {open ? <ChevronUp /> : <ChevronDown />}
          </span>
        </VarItem>
      </UnstyledButton>
      <Collapse in={open}>
        <div
          style={{
            borderBottom: `1px solid ${theme.colorScheme === 'dark' ? colors.B20 : colors.B85}`,
            marginBottom: 10,
            paddingLeft: 12,
          }}
        >
          {Object.keys(type).map((key, index) => {
            let varType = type[key];

            if (!['boolean', 'string', 'number', 'object', 'array'].includes(varType)) {
              varType = typeof varType;
            }

            if (varType === 'object') {
              return <VarItemsDropdown key={index} name={key} type={type[key]} />;
            }

            return (
              <Tooltip data-test-id={'Tooltip'} label={idClipboard.copied ? <Check /> : <Copy />}>
                <ActionIcon
                  variant="transparent"
                  onClick={() => idClipboard.copy(`${name}.${key}`)}
                  sx={{ width: '100%', height: 'unset', minWidth: 'unset', minHeight: 'unset' }}
                >
                  <VarItem key={index} name={key} type={varType} />
                </ActionIcon>
              </Tooltip>
            );
          })}
        </div>
      </Collapse>
    </>
  );
};
