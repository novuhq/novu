import { useState } from 'react';
import { colors } from '../../../../design-system';
import { Collapse, UnstyledButton, useMantineTheme } from '@mantine/core';
import { ChevronUp } from '../../../../design-system/icons';
import { ChevronDown } from '../../../../design-system/icons';

export const VarLabel = ({ label, children }) => {
  const [open, setOpen] = useState(true);
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
          marginBottom: 15,
        }}
      >
        <div
          style={{
            color: theme.colorScheme === 'dark' ? colors.white : colors.B60,
            fontSize: 14,
            fontWeight: 'bold',
          }}
        >
          {label}
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
