import React, { useState } from 'react';
import { Popover, createStyles } from '@mantine/core';
import styled from '@emotion/styled';
import { useFormContext } from 'react-hook-form';

import { Text } from '../typography/text/Text';
import { Switch } from '../switch/Switch';
import { useTemplateButtonStyles } from './TemplateButton.styles';
import { colors } from '../config';
import { IconWrapper } from './IconWrapper';
import { UnstyledButton, UnstyledButtonProps, createPolymorphicComponent } from '@mantine/core';

const Button = createPolymorphicComponent<'button', UnstyledButtonProps>(
  React.forwardRef<HTMLButtonElement, UnstyledButtonProps>((props, ref) => {
    return <WrapperButton ref={ref} {...props} />;
  })
);

const WrapperButton: any = styled(UnstyledButton)`
  position: relative;

  @media screen and (max-width: 1400px) {
    padding: 0 5px;
  }
`;

const usePopoverStyles = createStyles(() => ({
  dropdown: {
    position: 'absolute',
    padding: '12px 15px 14px',
    backgroundColor: colors.error,
    color: colors.white,
    border: 'none',
    marginTop: '1px',
    maxWidth: 300,
  },
  arrow: {
    backgroundColor: colors.error,
    height: '7px',
    border: 'none',
    margin: '0px',
  },
}));

interface ITemplateButtonProps {
  Icon: React.FC<any>;
  description: string;
  label: string;
  active?: boolean;
  action?: boolean;
  tabKey: string;
  testId?: string;
  checked?: boolean;
  readonly?: boolean;
  switchButton?: (boolean) => void;
  changeTab: (string) => void;
  errors?: boolean | string;
}

export function TemplateButton({
  description,
  active,
  changeTab,
  tabKey,
  action = false,
  switchButton,
  checked = false,
  readonly = false,
  label,
  Icon,
  testId,
  errors = false,
}: ITemplateButtonProps) {
  const { cx, classes, theme } = useTemplateButtonStyles();
  const disabled = action && !checked;
  const disabledColor = disabled ? { color: theme.colorScheme === 'dark' ? colors.B40 : colors.B70 } : {};
  const disabledProp = disabled ? { disabled } : {};
  const [popoverOpened, setPopoverOpened] = useState(false);
  const { trigger } = useFormContext();
  const { classes: popoverClasses } = usePopoverStyles();

  return (
    <Button
      onMouseEnter={() => setPopoverOpened(true)}
      onMouseLeave={() => setPopoverOpened(false)}
      onClick={async () => {
        if (active) {
          return;
        }

        changeTab(tabKey);
      }}
      data-test-id={testId}
      className={cx(classes.button, { [classes.active]: active })}
    >
      <ButtonWrapper>
        <LeftContainerWrapper>
          <IconWrapper className={classes.linkIcon}>
            <Icon {...disabledProp} />
          </IconWrapper>
          <StyledContentWrapper>
            <Text {...disabledColor} weight="bold">
              {label}
            </Text>
            <Text mt={3} color={colors.B60} {...disabledColor}>
              {description}
            </Text>
          </StyledContentWrapper>
        </LeftContainerWrapper>

        <ActionWrapper>
          {action && !readonly && (
            <Switch checked={checked} onChange={(e) => switchButton && switchButton(e.target.checked)} />
          )}
        </ActionWrapper>
      </ButtonWrapper>

      {errors && (
        <Popover
          classNames={popoverClasses}
          withArrow
          opened={popoverOpened}
          transition="rotate-left"
          transitionDuration={250}
          offset={theme.spacing.xs}
          position="right"
        >
          <Popover.Target>
            <ErrorCircle data-test-id="error-circle" dark={theme.colorScheme === 'dark'} />
          </Popover.Target>
          <Popover.Dropdown>
            <Text color={colors.white} rows={1}>
              {errors || 'Something is missing here'}
            </Text>
          </Popover.Dropdown>
        </Popover>
      )}
    </Button>
  );
}
const ErrorCircle = styled.div<{ dark: boolean }>`
  width: 11px;
  height: 11px;
  display: inline-block;
  position: absolute;
  right: -6px;
  top: calc(50% - 4px);
  background: ${colors.error};
  border-radius: 50%;
  border: 3px solid ${({ dark }) => (dark ? colors.B15 : 'white')};
`;

const ActionWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const LeftContainerWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const ButtonWrapper = styled.div`
  display: flex;
  justify-content: space-between;
`;

const StyledContentWrapper = styled.div`
  padding-right: 10px;
`;
