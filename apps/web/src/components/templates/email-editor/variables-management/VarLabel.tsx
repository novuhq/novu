import { useState } from 'react';
import { colors } from '../../../../design-system';
import { Collapse, UnstyledButton } from '@mantine/core';
import { ChevronUp } from '../../../../design-system/icons';
import { ChevronDown } from '../../../../design-system/icons/arrows/ChevronDown';

export const VarLabel = ({ label, children }) => {
  const [open, setOpen] = useState(true);

  return (
    <>
      <UnstyledButton
        onClick={() => {
          setOpen(!open);
        }}
        type="button"
        sx={{
          width: '100%',
          marginBottom: 15,
        }}
      >
        <div
          style={{
            color: colors.white,
            fontSize: 14,
            fontWeight: 'bold',
          }}
        >
          {label}:
          <span
            style={{
              float: 'right',
            }}
          >
            {open ? <ChevronUp /> : <ChevronDown />}
          </span>
        </div>
      </UnstyledButton>
      <Collapse in={open}>{children}</Collapse>
    </>
  );
};
