import React, { useState } from 'react';
import { UnstyledButton, Popover, ActionIcon } from '@mantine/core';
import styled from '@emotion/styled';
import { Text } from '../typography/text/Text';
import { Switch } from '../switch/Switch';
import { useStyles } from './TemplateButton.styles';
import { colors } from '../config';
import { DotsHorizontal } from '../icons';
import { When } from '../../components/utils/When';
import { Tooltip } from '../tooltip/Tooltip';
import { useFormContext } from 'react-hook-form';
import { useEnvController } from '../../store/use-env-controller';

interface ITemplateButtonProps {
  Icon: React.FC<any>;
  label: string;
  active?: boolean;
  action?: boolean;
  testId?: string;
  checked?: boolean;
  readonly?: boolean;
  switchButton?: (boolean) => void;
  changeTab?: (string) => void;
  errors?: boolean | string;
  showDots?: boolean;
  id?: string | undefined;
  onDelete?: () => void;
  showDropZone?: boolean;
}

export function ChannelButton({
  active,
  action = false,
  switchButton,
  checked = false,
  readonly = false,
  label,
  Icon,
  testId,
  errors = false,
  showDots = true,
  id = undefined,
  onDelete = () => {},
  showDropZone = false,
}: ITemplateButtonProps) {
  const { readonly: readonlyEnv } = useEnvController();
  const { cx, classes, theme } = useStyles();
  const disabled = action && !checked;
  const disabledColor = disabled ? { color: theme.colorScheme === 'dark' ? colors.B40 : colors.B70 } : {};
  const disabledProp = disabled ? { disabled } : {};
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [showDotMenu, setShowDotMenu] = useState(false);
  const { watch, setValue } = useFormContext();
  const steps = watch('steps');

  const tooltip = (
    <div>
      <Text>
        <a
          data-test-id="delete-step-action"
          style={{
            pointerEvents: 'all',
          }}
          href="/"
          onClick={(e) => {
            e.preventDefault();
            const newSteps = steps.filter((step) => step._id !== id);
            setShowDotMenu(false);
            setValue('steps', newSteps);
            onDelete();
          }}
        >
          Delete node
        </a>
      </Text>
    </div>
  );

  return (
    <>
      <Button
        onMouseEnter={() => setPopoverOpened(true)}
        onMouseLeave={() => setPopoverOpened(false)}
        data-test-id={testId}
        className={cx(classes.button, { [classes.active]: active })}
        sx={{
          backgroundColor: theme.colorScheme === 'dark' ? colors.B17 : colors.white,
        }}
      >
        <When truthy={showDropZone}>
          <Dropzone data-test-id="dropzone-area" dark={theme.colorScheme === 'dark'}>
            Place your next step here
          </Dropzone>
        </When>
        <ButtonWrapper>
          <LeftContainerWrapper>
            <IconWrapper className={classes.linkIcon}>{Icon ? <Icon {...disabledProp} /> : null}</IconWrapper>
            <StyledContentWrapper>
              <Text {...disabledColor} weight="bold">
                {label}
              </Text>
            </StyledContentWrapper>
          </LeftContainerWrapper>

          <ActionWrapper>
            {action && !readonly && (
              <Switch checked={checked} onChange={(e) => switchButton && switchButton(e.target.checked)} />
            )}
            <When truthy={showDots && !readonlyEnv}>
              <Tooltip label={tooltip} opened={showDotMenu}>
                <a
                  style={{
                    pointerEvents: 'all',
                  }}
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowDotMenu(!showDotMenu);
                  }}
                >
                  <ActionIcon variant="transparent" data-test-id="step-actions-dropdown">
                    <DotsHorizontal />
                  </ActionIcon>
                </a>
              </Tooltip>
            </When>
          </ActionWrapper>
        </ButtonWrapper>

        {errors && (
          <Popover
            styles={{
              root: {
                position: 'absolute',
                right: 0,
                top: 'calc(50% - 1px)',
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
                marginTop: '1px',
              },
            }}
            withArrow
            opened={popoverOpened}
            transition="rotate-left"
            transitionDuration={250}
            gutter={theme.spacing.xs}
            mb={20}
            placement="center"
            position="right"
            target={<ErrorCircle data-test-id="error-circle" dark={theme.colorScheme === 'dark'} />}
          >
            {errors || 'Something is missing here'}
          </Popover>
        )}
      </Button>
    </>
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

const IconWrapper = styled.div`
  padding-right: 15px;

  @media screen and (max-width: 1400px) {
    padding-right: 5px;

    svg {
      width: 20px;
      height: 20px;
    }
  }
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

const Dropzone = styled.div<{ dark: boolean }>`
  position: absolute;
  top: 0px;
  bottom: 0px;
  left: 0px;
  right: 0px;
  background: ${({ dark }) => (dark ? colors.B17 : colors.B98)};
  color: ${({ dark }) => (dark ? colors.B98 : colors.B17)};
  border-radius: 7px;
  text-align: center;
  line-height: 75px;
  z-index: 1000000;
  border: 1px dashed ${({ dark }) => (dark ? colors.B30 : colors.B80)};
`;

const Button = styled(UnstyledButton)`
  position: relative;

  @media screen and (max-width: 1400px) {
    padding: 0 5px;
  }
`;
