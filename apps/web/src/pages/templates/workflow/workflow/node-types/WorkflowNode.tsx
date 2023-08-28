import styled from '@emotion/styled';
import { createStyles, Group, Popover as MantinePopover, UnstyledButton, useMantineColorScheme } from '@mantine/core';
import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  InAppProviderIdEnum,
  providers,
  SmsProviderIdEnum,
  StepTypeEnum,
} from '@novu/shared';
import React, { useEffect, useMemo, useState } from 'react';
import { useViewport } from 'react-flow-renderer';
import { useFormContext } from 'react-hook-form';

import { useSegment } from '../../../../../components/providers/SegmentProvider';
import { When } from '../../../../../components/utils/When';
import { CONTEXT_PATH } from '../../../../../config';
import { Switch } from '../../../../../design-system';
import { Button } from '../../../../../design-system/button/Button';
import { colors } from '../../../../../design-system/config';
import { Trash } from '../../../../../design-system/icons';
import { Popover } from '../../../../../design-system/popover';
import { useStyles } from '../../../../../design-system/template-button/TemplateButton.styles';
import { Text } from '../../../../../design-system/typography/text/Text';
import {
  useActiveIntegrations,
  useEnvController,
  useIntegrationLimit,
  useIsMultiProviderConfigurationEnabled,
} from '../../../../../hooks';
import { CHANNEL_TYPE_TO_STRING } from '../../../../../utils/channels';
import { IntegrationsListModal } from '../../../../integrations/IntegrationsListModal';
import { IntegrationsStoreModal } from '../../../../integrations/IntegrationsStoreModal';
import { TemplateEditorAnalyticsEnum } from '../../../constants';
import { getFormattedStepErrors } from '../../../shared/errors';
import { DisplayPrimaryProviderIcon } from '../../DisplayPrimaryProviderIcon';

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
  subtitle?: string | React.ReactNode;
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
  subtitle,
}: ITemplateButtonProps) {
  const segment = useSegment();
  const { readonly: readonlyEnv, environment } = useEnvController();
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
  const { isLimitReached: isEmailLimitReached } = useIntegrationLimit(ChannelTypeEnum.EMAIL);
  const { isLimitReached: isSmsLimitReached } = useIntegrationLimit(ChannelTypeEnum.SMS);
  const [hover, setHover] = useState(false);
  const isMultiProviderConfigurationEnabled = useIsMultiProviderConfigurationEnabled();
  const { colorScheme } = useMantineColorScheme();
  const isChannelStep = useMemo(() => {
    return [StepTypeEnum.IN_APP, StepTypeEnum.EMAIL, StepTypeEnum.PUSH, StepTypeEnum.SMS, StepTypeEnum.CHAT].includes(
      channelType
    );
  }, [channelType]);

  const integrationsByEnv = useMemo(() => {
    return integrations?.filter((integration) => integration._environmentId === environment?._id);
  }, [environment, integrations]);

  const hasActiveIntegration = useMemo(() => {
    const isEmailStep = channelType === StepTypeEnum.EMAIL;
    const isSmsStep = channelType === StepTypeEnum.SMS;

    if (isChannelStep) {
      const isActive = !!integrationsByEnv?.some((integration) => integration.channel === tabKey);

      if (isActive && isEmailStep) {
        const isNovuProvider = integrationsByEnv?.some(
          (integration) => integration.providerId === EmailProviderIdEnum.Novu && integration.primary
        );

        return isNovuProvider ? !isEmailLimitReached : isActive;
      }

      if (isActive && isSmsStep) {
        const isNovuProvider = integrationsByEnv?.some(
          (integration) => integration.providerId === SmsProviderIdEnum.Novu && integration.primary
        );

        return isNovuProvider ? !isSmsLimitReached : isActive;
      }

      return isActive;
    }

    return true;
  }, [integrationsByEnv, tabKey, isEmailLimitReached, isSmsLimitReached, isChannelStep]);

  const getPrimaryIntegration = useMemo(() => {
    if (!hasActiveIntegration) {
      return undefined;
    }
    if (isChannelStep) {
      if ([StepTypeEnum.EMAIL, StepTypeEnum.SMS].includes(channelType)) {
        return integrationsByEnv?.find((integration) => integration.primary && integration.channel === channelKey)
          ?.providerId;
      }

      return integrationsByEnv?.find((integration) => integration.channel === channelKey)?.providerId;
    }

    return undefined;
  }, [isChannelStep, hasActiveIntegration, integrationsByEnv, channelKey, channelType]);

  const onIntegrationModalClose = () => {
    setIntegrationsModalVisible(false);
    setPopoverOpened(false);
  };

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

  const provider = providers.find((_provider) => _provider.id === getPrimaryIntegration);

  const logoSrc = provider && `${CONTEXT_PATH}/static/images/providers/${colorScheme}/square/${provider.id}.svg`;

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
        <Group w="100%" noWrap>
          <LeftContainerWrapper>
            <DisplayPrimaryProviderIcon
              Icon={Icon}
              disabledProp={disabledProp}
              getPrimaryIntegration={getPrimaryIntegration}
              isChannelStep={isChannelStep}
              logoSrc={logoSrc}
            />

            <StyledContentWrapper>
              <Text {...disabledColor} weight="bold" size={16} data-test-id="workflow-node-label">
                {label}
              </Text>
              {subtitle && (
                <Text {...disabledColor} size={12} color={colors.B60} rows={1} data-test-id="workflow-node-subtitle">
                  {subtitle}
                </Text>
              )}
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
        </Group>
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
            description={`Please configure a ${CHANNEL_TYPE_TO_STRING[
              channelKey
            ]?.toLowerCase()} provider to send notifications over this channel`}
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
      {isMultiProviderConfigurationEnabled ? (
        <IntegrationsListModal
          isOpen={isIntegrationsModalVisible}
          onClose={onIntegrationModalClose}
          scrollTo={tabKey}
        />
      ) : (
        <IntegrationsStoreModal
          openIntegration={isIntegrationsModalVisible}
          closeIntegration={onIntegrationModalClose}
          scrollTo={tabKey}
        />
      )}
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

const ActionWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const LeftContainerWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1 1 auto;
`;

const StyledContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
  justify-content: flex-start;
  width: 100%;
  flex: 1;
`;

const UnstyledButtonStyled = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  pointer-events: all;
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B17 : colors.white)};
  width: 280px;
  padding: 20px;
`;
