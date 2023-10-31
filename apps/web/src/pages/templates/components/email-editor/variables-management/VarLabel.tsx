import { useState } from 'react';
import { colors, ChevronUp, ChevronDown } from '@novu/design-system';
import { Collapse, UnstyledButton, useMantineTheme } from '@mantine/core';

export const VarLabel = ({ label, children }) => {
  const [open, setOpen] = useState(true);
  const theme = useMantineTheme();

  return (
    <>
      <UnstyledButton
        data-test-id="var-label"
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
