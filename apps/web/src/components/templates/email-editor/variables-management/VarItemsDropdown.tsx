import { useState } from 'react';
import { Collapse, UnstyledButton, useMantineTheme } from '@mantine/core';
import { ChevronUp } from '../../../../design-system/icons';
import { ChevronDown } from '../../../../design-system/icons';
import { VarItem } from './VarItem';
import { colors } from '../../../../design-system';

export const VarItemsDropdown = ({ name, type }) => {
  const [open, setOpen] = useState(false);
  const theme = useMantineTheme();

  return (
    <>
      <UnstyledButton
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

            if (!['boolean', 'string', 'number', 'object'].includes(varType)) {
              varType = typeof varType;
            }

            if (varType === 'object') {
              return <VarItemsDropdown key={index} name={key} type={type[key]} />;
            }

            return <VarItem key={index} name={key} type={varType} />;
          })}
        </div>
      </Collapse>
    </>
  );
};
