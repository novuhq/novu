import { useState } from 'react';
import { ActionIcon, Collapse, Tooltip, UnstyledButton, useMantineTheme } from '@mantine/core';
import { Check, ChevronUp, Copy } from '../../../../design-system/icons';
import { ChevronDown } from '../../../../design-system/icons';
import { VarItem } from './VarItem';
import { colors } from '../../../../design-system';
import { useClipboard } from '@mantine/hooks';

export const VarItemsDropdown = ({ name, type }) => {
  const [open, setOpen] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState<number | null>(null);
  const theme = useMantineTheme();
  const { copy } = useClipboard();

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
              <Tooltip data-test-id={'Tooltip'} label={index === copiedVariable ? 'Copied!' : 'Copy key'} key={index}>
                <ActionIcon
                  variant="transparent"
                  onClick={() => {
                    setCopiedVariable(index);
                    copy(`${name}.${key}`);
                    setTimeout(() => setCopiedVariable(null), 500);
                  }}
                  sx={{ width: '100%', height: 'unset', minWidth: 'unset', minHeight: 'unset', lineHeight: '1.15' }}
                >
                  <VarItem key={index} name={key} type={varType}>
                    <span
                      style={{ position: 'absolute', right: '2%', bottom: index === copiedVariable ? '40%' : '20%' }}
                    >
                      {index === copiedVariable ? <Check /> : <Copy />}
                    </span>
                  </VarItem>
                </ActionIcon>
              </Tooltip>
            );
          })}
        </div>
      </Collapse>
    </>
  );
};
