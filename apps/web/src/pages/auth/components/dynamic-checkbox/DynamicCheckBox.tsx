import React, { SVGProps, useState } from 'react';
import { CheckboxProps } from '@mantine/core';
import styled from '@emotion/styled';

import { colors, Checkbox, Tooltip } from '@novu/design-system';
import { ProductUseCasesEnum } from '@novu/shared';

import { checkboxStyles, tooltipStyles } from './DynamicCheckBox.styles';

type IDynamicCheckBoxProps = CheckboxProps;

export function DynamicCheckBox({ ...props }: IDynamicCheckBoxProps) {
  const { classes: checkboxClasses } = checkboxStyles();
  const { classes: tooltipClasses } = tooltipStyles();
  const [isHovered, setIsHovered] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const handleCheckboxChange = (event) => {
    setIsChecked(event.currentTarget.checked);

    if (props.onChange) {
      props.onChange(event);
    }
  };

  return (
    <Checkbox
      checked={isChecked}
      className="innerCheckbox"
      classNames={checkboxClasses}
      label={props.label}
      onChange={handleCheckboxChange}
    />
  );
}

const Container = styled.div<{ checked: boolean }>`
  border-radius: 8px;
  padding: 8px;
  margin: 0 4px 0 4px;
  transition: background 0.6s ease;
  background: transparent;

  &:hover {
    background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.white)};
  }

  &:hover .innerCheckbox {
    input {
      border: 1px solid ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B15)};
    }

    label {
      color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B15)};
    }
  }

  ${({ theme, checked }) => {
    return (
      checked &&
      `  
        label {
          color: ${theme.colorScheme === 'dark' ? colors.white : colors.B15};
        }
      `
    );
  }};
`;

const tooltipLabel = {
  [ProductUseCasesEnum.IN_APP]:
    'Utilize Novu’s pre-built customizable in-app component. Or opt for the headless library to create your own in-app notification center',
  [ProductUseCasesEnum.MULTI_CHANNEL]:
    'Notify subscribers using a wide range of channels:In-App, Email, Chat, Push, and SMS.',
  [ProductUseCasesEnum.DIGEST]: 'Digest collects multiple trigger events, aggregates them into a single message.',
  [ProductUseCasesEnum.DELAY]:
    'The delay action awaits a specified amount of time before moving on to trigger the following steps of the workflow.',
  [ProductUseCasesEnum.TRANSLATION]:
    'Upload translations to use them as variables or in the autosuggest for the editor.',
};
