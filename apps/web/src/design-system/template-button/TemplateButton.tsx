import React from 'react';
import { UnstyledButton, Group, Popover } from '@mantine/core';
import styled from 'styled-components';
import { Text } from '../typography/text/Text';
import { Switch } from '../switch/Switch';
import { useStyles } from './TemplateButton.styles';
import { colors } from '../config';

interface ITemplateButtonProps {
  Icon: React.FC<any>;
  description: string;
  label: string;
  active?: boolean;
  action?: boolean;
  tabKey: string;
  testId?: string;
  checked?: boolean;
  switchButton?: (boolean) => void;
  changeTab: (string) => void;
  areThereErrors?: boolean;
}

export function TemplateButton({
  description,
  active,
  changeTab,
  tabKey,
  action = false,
  switchButton,
  checked = false,
  label,
  Icon,
  testId,
  areThereErrors = false,
}: ITemplateButtonProps) {
  const { cx, classes, theme } = useStyles();
  const disabled = action && !checked;
  const disabledColor = disabled ? { color: theme.colorScheme === 'dark' ? colors.B40 : colors.B70 } : {};
  const disabledProp = disabled ? { disabled } : {};

  return (
    <Popover
      styles={{
        root: {
          width: '100%',
        },
        inner: {
          padding: '12px 15px 14px',
        },
        arrow: {
          backgroundColor: colors.error,
          height: '7px',
          border: 'none',
          margin: '0px',
        },
        body: {
          backgroundColor: colors.error,
          position: 'relative',
          color: colors.white,
          border: 'none',
          marginTop: '-20px',
        },
      }}
      withArrow
      transition="rotate-left"
      transitionDuration={250}
      gutter={theme.spacing.xs}
      opened={!active && areThereErrors}
      mb={20}
      placement="center"
      position="right"
      target={
        <UnstyledButton
          onClick={() => !active && changeTab(tabKey)}
          data-test-id={testId}
          className={cx(classes.button, { [classes.active]: active })}>
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
              {action && <Switch checked={checked} onChange={(e) => switchButton && switchButton(e.target.checked)} />}
            </ActionWrapper>
          </ButtonWrapper>
        </UnstyledButton>
      }>
      Something is missing here
    </Popover>
  );
}

const IconWrapper = styled.div`
  padding-right: 15px;
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
const StyledGroup = styled(Group)``;
