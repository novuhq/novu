import { useState } from 'react';
import { Collapse, UnstyledButton, useMantineTheme } from '@mantine/core';
import { ChevronUp, ChevronDown, colors } from '@novu/design-system';
import { VarItem } from './VarItem';
import { VarItemTooltip } from './VarItemTooltip';

export const VarItemsDropdown = ({ name, type }) => {
  const [open, setOpen] = useState(false);
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
            let varType = type?.[key];

            if (varType !== null && !['boolean', 'string', 'number', 'object', 'array'].includes(varType)) {
              varType = typeof varType;
            }

            if (varType === 'object') {
              return <VarItemsDropdown key={index} name={key} type={type?.[key]} />;
            }

            return <VarItemTooltip pathToCopy={`${name}.${key}`} name={key} type={varType} key={index} />;
          })}
        </div>
      </Collapse>
    </>
  );
};
