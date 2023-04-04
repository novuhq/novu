import React, { useEffect, useMemo, useState } from 'react';
import { Popover as MantinePopover, createStyles, UnstyledButton } from '@mantine/core';
import styled from '@emotion/styled';
import { useFormContext } from 'react-hook-form';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { Text } from '../../../../../design-system/typography/text/Text';
import { Switch } from '../../../../../design-system/switch/Switch';
import { useStyles } from '../../../../../design-system/template-button/TemplateButton.styles';
import { colors } from '../../../../../design-system/config';
import { Trash } from '../../../../../design-system/icons';
import { When } from '../../../../../components/utils/When';
import { useActiveIntegrations, useEnvController, useIntegrationLimit } from '../../../../../hooks';
import { useViewport } from 'react-flow-renderer';
import { getFormattedStepErrors } from '../../../shared/errors';
import { Popover } from '../../../../../design-system/popover';
import { Button } from '../../../../../design-system/button/Button';
import { IntegrationsStoreModal } from '../../../../integrations/IntegrationsStoreModal';
import { useSegment } from '../../../../../components/providers/SegmentProvider';
import { TemplateEditorAnalyticsEnum } from '../../../constants';

const CHANNEL_TYPE_TO_TEXT = {
  [ChannelTypeEnum.IN_APP]: 'in-app',
  [ChannelTypeEnum.EMAIL]: 'email',
  [ChannelTypeEnum.SMS]: 'sms',
  [ChannelTypeEnum.CHAT]: 'chat',
  [ChannelTypeEnum.PUSH]: 'push',
};

interface ITemplateButtonProps {
  Icon: React.FC<any>;
  label: string;
  active?: boolean;
  action?: boolean;
  testId?: string;
  tabKey?: ChannelTypeEnum;
  channelType: StepTypeEnum;
  checked?: boolean;
  readonly?: boolean;
  switchButton?: (boolean) => void;
  changeTab?: (string) => void;
  errors?: boolean | string;
  showDelete?: boolean;
  id?: string;
  index?: number;
  onDelete?: () => void;
  dragging?: boolean;
  disabled?: boolean;
}

const usePopoverStyles = createStyles(() => ({
  dropdown: {
    padding: '12px 15px 14px',
    backgroundColor: colors.error,
    color: colors.white,
    border: 'none',
    maxWidth: 300,
  },
  arrow: {
    backgroundColor: colors.error,
    width: '7px',
    height: '7px',
    margin: '0px',
  },
}));

const MENU_CLICK_OUTSIDE_EVENTS = ['click', 'mousedown', 'touchstart'];

export function WorkflowNode({
  active = false,
  action = false,
  switchButton,
  checked = false,
  readonly = false,
  label,
  Icon,
  tabKey,
  channelType,
  index,
  testId,
  errors: initialErrors = false,
  showDelete = true,
  id = undefined,
  onDelete = () => {},
  dragging = false,
  disabled: initDisabled,
}: ITemplateButtonProps) {
  const segment = useSegment();
  const { readonly: readonlyEnv } = useEnvController();
  const { integrations } = useActiveIntegrations({ refetchOnMount: false, refetchOnWindowFocus: false });
  const { cx, classes, theme } = useStyles();
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [disabled, setDisabled] = useState(initDisabled);
  const [isIntegrationsModalVisible, setIntegrationsModalVisible] = useState(false);
  const disabledColor = disabled ? { color: theme.colorScheme === 'dark' ? colors.B40 : colors.B70 } : {};
  const disabledProp = disabled ? { disabled: disabled } : {};
  const { classes: popoverClasses } = usePopoverStyles();
  const viewport = useViewport();
  const channelKey = tabKey ?? '';
  const { isLimitReached } = useIntegrationLimit(ChannelTypeEnum.EMAIL);
  const [hover, setHover] = useState(false);

  const hasActiveIntegration = useMemo(() => {
    const isChannelStep = [StepTypeEnum.EMAIL, StepTypeEnum.PUSH, StepTypeEnum.SMS, StepTypeEnum.CHAT].includes(
      channelType
    );
    const isEmailStep = channelType === StepTypeEnum.EMAIL;

    if (isChannelStep) {
      const isActive = !!integrations?.some((integration) => integration.channel === tabKey);

      return isActive || (isEmailStep && !isLimitReached);
    }

    return true;
  }, [integrations, tabKey, isLimitReached]);

  const {
    watch,
    formState: { errors },
  } = useFormContext();

  let stepErrorContent = initialErrors;

  if (typeof index === 'number') {
    stepErrorContent = getFormattedStepErrors(index, errors);
  }

  useEffect(() => {
    const subscription = watch((values) => {
      const thisStep = values.steps.find((step) => step._id === id);

      if (thisStep) {
        setDisabled(!thisStep.active);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch]);

  return (
    <>
      <UnstyledButtonStyled
        role={'button'}
        onMouseEnter={() => {
          setPopoverOpened(true);
          setHover(true);
        }}
        onMouseLeave={() => {
          setPopoverOpened(false);
          setHover(false);
        }}
        data-test-id={testId}
        className={cx(classes.button, { [classes.active]: active })}
      >
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
            <When truthy={showDelete && !readonlyEnv && !dragging && hover}>
              <UnstyledButton
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                sx={{
                  lineHeight: 1,
                  zIndex: 9999,
                }}
                data-test-id="delete-step-action"
              >
                <Trash
                  style={{
                    background: 'transparent',
                  }}
                />
              </UnstyledButton>
            </When>
          </ActionWrapper>
        </ButtonWrapper>
        {!hasActiveIntegration && (
          <Popover
            opened={popoverOpened}
            withinPortal
            transition="rotate-left"
            transitionDuration={250}
            offset={theme.spacing.xs}
            target={<ErrorCircle data-test-id="error-circle" dark={theme.colorScheme === 'dark'} />}
            title="Connect provider"
            titleGradient="red"
            description={`Please configure a ${CHANNEL_TYPE_TO_TEXT[channelKey]} provider to send notifications over this channel`}
            content={
              <ConfigureProviderButton
                onClick={() => {
                  segment.track(TemplateEditorAnalyticsEnum.CONFIGURE_PROVIDER_POPOVER_CLICK);
                  setIntegrationsModalVisible(true);
                  setPopoverOpened(false);
                }}
              >
                Configure
              </ConfigureProviderButton>
            }
          />
        )}
        {hasActiveIntegration && stepErrorContent && (
          <MantinePopover
            withinPortal
            classNames={popoverClasses}
            withArrow
            opened={popoverOpened && Object.keys(stepErrorContent).length > 0}
            transition="rotate-left"
            transitionDuration={250}
            offset={theme.spacing.xs}
            position="right"
            zIndex={4}
            positionDependencies={[dragging, viewport]}
            clickOutsideEvents={MENU_CLICK_OUTSIDE_EVENTS}
          >
            <MantinePopover.Target>
              <ErrorCircle data-test-id="error-circle" dark={theme.colorScheme === 'dark'} />
            </MantinePopover.Target>
            <MantinePopover.Dropdown>
              <Text rows={1} color={colors.white}>
                {stepErrorContent || 'Something is missing here'}
              </Text>
            </MantinePopover.Dropdown>
          </MantinePopover>
        )}
      </UnstyledButtonStyled>
      <IntegrationsStoreModal
        openIntegration={isIntegrationsModalVisible}
        closeIntegration={() => {
          setIntegrationsModalVisible(false);
          setPopoverOpened(false);
        }}
        scrollTo={tabKey}
      />
    </>
  );
}

const ConfigureProviderButton = styled(Button)`
  margin-top: 16px;
`;

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
  overflow: hidden;
`;

const ButtonWrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
`;

const StyledContentWrapper = styled.div`
  padding-right: 10px;
`;

const UnstyledButtonStyled = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  pointer-events: all;
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B17 : colors.white)};

  @media screen and (max-width: 1400px) {
    padding: 0 5px;
  }
`;
