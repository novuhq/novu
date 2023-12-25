import React, { SVGProps, useState } from 'react';
import { CheckboxProps } from '@mantine/core';
import styled from '@emotion/styled';

import { colors, Checkbox } from '@novu/design-system';
import { ProductUseCasesEnum } from '@novu/shared';

import useStyles from './DynamicCheckBox.styles';

interface IDynamicCheckBoxProps extends CheckboxProps {
  Icon: (props: Omit<SVGProps<SVGSVGElement>, 'ref'>) => JSX.Element;
  type: ProductUseCasesEnum;
}

export function DynamicCheckBox({ Icon, type, ...props }: IDynamicCheckBoxProps) {
  const { classes } = useStyles();
  const [isHovered, setIsHovered] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const handleCheckboxChange = (event) => {
    setIsChecked(event.currentTarget.checked);

    if (props.onChange) {
      props.onChange(event);
    }
  };

  return (
    <Container
      checked={isChecked}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-test-id={`check-box-container${type ? `-${type}` : ''}`}
    >
      <UnselectedIcon
        as={Icon}
        ishovered={isHovered}
        ischecked={isChecked}
        data-test-id={`unselectedIcon${type ? `-${type}` : ''}`}
      />
      <Checkbox
        checked={isChecked}
        className="innerCheckbox"
        classNames={classes}
        label={props.label}
        onChange={handleCheckboxChange}
        data-test-id={`check-box${type ? `-${type}` : ''}`}
      />
    </Container>
  );
}

const UnselectedIcon = styled.svg<{ ishovered: boolean; ischecked: boolean }>`
  position: absolute;
  height: 20px;
  width: 20px;
  opacity: ${({ ishovered, ischecked }) => (ishovered || ischecked ? 0 : 1)};
  transition: opacity 0.5s ease;
  color: ${colors.B60};
`;

const Container = styled.div<{ checked: boolean }>`
  border-radius: 8px;
  padding: 8px;
  margin: 0 4px 0 4px;
  transition: background 0.6s ease;
  background: transparent;

  &:hover {
    background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.B85)};
  }

  &:hover .innerCheckbox {
    input {
      border: 1px solid white;
      transition: border 0.3s ease;
    }
  }

  ${({ theme, checked }) => {
    return (
      checked &&
      `  
        label {
          color: ${theme.colorScheme === 'dark' ? colors.white : colors.B40};
        }
      `
    );
  }};
`;
