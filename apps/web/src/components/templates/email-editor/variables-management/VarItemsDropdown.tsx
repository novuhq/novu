import { useState } from 'react';
import { Collapse, UnstyledButton } from '@mantine/core';
import { ChevronUp } from '../../../../design-system/icons';
import { ChevronDown } from '../../../../design-system/icons/arrows/ChevronDown';
import { VarItem } from './VarItem';

export const VarItemsDropdown = ({ name, type }) => {
  const [open, setOpen] = useState(false);

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
            borderBottom: `1px solid #292933`,
            marginBottom: 10,
            paddingLeft: 12,
          }}
        >
          {Object.keys(type).map((key) => {
            return <VarItem name={key} type={type[key]} />;
          })}
        </div>
      </Collapse>
    </>
  );
};
