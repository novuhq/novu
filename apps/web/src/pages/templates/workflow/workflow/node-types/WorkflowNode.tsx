import styled from '@emotion/styled';
import { Group, UnstyledButton, useMantineColorScheme } from '@mantine/core';
import { ChannelTypeEnum, providers, StepTypeEnum } from '@novu/shared';
import React, { useEffect, useState } from 'react';
import { useViewport } from 'react-flow-renderer';
import { useFormContext } from 'react-hook-form';

import { useSegment } from '../../../../../components/providers/SegmentProvider';
import { When } from '../../../../../components/utils/When';
import { CONTEXT_PATH } from '../../../../../config';
import { Switch } from '../../../../../design-system';
import { Button } from '../../../../../design-system/button/Button';
import { colors } from '../../../../../design-system/config';
import { ProviderMissing, Trash } from '../../../../../design-system/icons';
import { useStyles } from '../../../../../design-system/template-button/TemplateButton.styles';
import { Text } from '../../../../../design-system/typography/text/Text';
import {
  useEnvController,
  useGetPrimaryIntegration,
  useHasActiveIntegrations,
  useIsMultiProviderConfigurationEnabled,
} from '../../../../../hooks';
import { CHANNEL_TYPE_TO_STRING } from '../../../../../utils/channels';
import { useSelectPrimaryIntegrationModal } from '../../../../integrations/components/multi-provider/useSelectPrimaryIntegrationModal';
import { IntegrationsListModal } from '../../../../integrations/IntegrationsListModal';
import { IntegrationsStoreModal } from '../../../../integrations/IntegrationsStoreModal';
import { TemplateEditorAnalyticsEnum } from '../../../constants';
import { getFormattedStepErrors } from '../../../shared/errors';
import { DisplayPrimaryProviderIcon } from '../../DisplayPrimaryProviderIcon';
import { NodeErrorPopover } from '../../NodeErrorPopover';

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
  const { cx, classes, theme } = useStyles();
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [disabled, setDisabled] = useState(initDisabled);
  const [isIntegrationsModalVisible, setIntegrationsModalVisible] = useState(false);
  const disabledColor = disabled ? { color: theme.colorScheme === 'dark' ? colors.B40 : colors.B70 } : {};
  const disabledProp = disabled ? { disabled: disabled } : {};

  const viewport = useViewport();
  const channelKey = tabKey ?? '';
  const [hover, setHover] = useState(false);
  const isMultiProviderConfigurationEnabled = useIsMultiProviderConfigurationEnabled();
  const { colorScheme } = useMantineColorScheme();
  const { openModal: openSelectPrimaryIntegrationModal, SelectPrimaryIntegrationModal } =
    useSelectPrimaryIntegrationModal();

  const { hasActiveIntegration, isChannelStep, activeIntegrationsByEnv } = useHasActiveIntegrations({
    filterByEnv: true,
    channelType: channelType as unknown as ChannelTypeEnum,
  });
  const { primaryIntegration, isPrimaryStep } = useGetPrimaryIntegration({
    filterByEnv: true,
    channelType: channelType as unknown as ChannelTypeEnum,
  });

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
  }, [watch, id]);

  const providerIntegration = isPrimaryStep
    ? primaryIntegration
    : activeIntegrationsByEnv?.find((integration) => integration.channel === channelKey)?.providerId;

  const provider = providers.find((_provider) => _provider.id === providerIntegration);

  const logoSrc = provider && `${CONTEXT_PATH}/static/images/providers/${colorScheme}/square/${provider?.id}.svg`;

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
              providerIntegration={providerIntegration}
              isChannelStep={isChannelStep}
              logoSrc={logoSrc}
            />

            <StyledContentWrapper>
              <Text {...disabledColor} weight="bold" size={16} data-test-id="workflow-node-label">
                {label}
              </Text>
              {Object.keys(stepErrorContent).length > 0 && (
                <Text {...disabledColor} size={12} color={colors.error} rows={1} data-test-id="workflow-node-error">
                  {stepErrorContent}
                </Text>
              )}
              {!(Object.keys(stepErrorContent).length > 0) && subtitle && (
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
          <NodeErrorPopover
            opened={popoverOpened}
            withinPortal
            transition="rotate-left"
            transitionDuration={250}
            offset={theme.spacing.xs}
            target={<ErrorCircle data-test-id="error-circle" dark={theme.colorScheme === 'dark'} />}
            titleIcon={<ProviderMissing />}
            title={`${CHANNEL_TYPE_TO_STRING[channelKey]} provider is not connected`}
            content={
              'Please configure or activate a provider instance for the ' +
              CHANNEL_TYPE_TO_STRING[channelKey] +
              ' channel to send notifications over this node'
            }
            actionItem={
              <Button
                onClick={() => {
                  segment.track(TemplateEditorAnalyticsEnum.CONFIGURE_PROVIDER_POPOVER_CLICK);
                  setIntegrationsModalVisible(true);
                  setPopoverOpened(false);
                }}
              >
                Open integration store
              </Button>
            }
          />
        )}
        {hasActiveIntegration && !primaryIntegration && isPrimaryStep && (
          <NodeErrorPopover
            opened={popoverOpened}
            withinPortal
            transition="rotate-left"
            transitionDuration={250}
            offset={theme.spacing.xs}
            target={<ErrorCircle data-test-id="error-circle" dark={theme.colorScheme === 'dark'} />}
            titleIcon={<ProviderMissing />}
            title="Select primary provider"
            content={
              'You have multiple provider instances for' +
              CHANNEL_TYPE_TO_STRING[channelKey] +
              `in the ${environment?.name} environment. Please select the primary instance.
            `
            }
            actionItem={
              <Button
                onClick={() => {
                  segment.track(TemplateEditorAnalyticsEnum.CONFIGURE_PROVIDER_POPOVER_CLICK);
                  openSelectPrimaryIntegrationModal({
                    environmentId: environment?._id,
                    channelType: tabKey,
                    onClose: () => {},
                  });
                  setPopoverOpened(false);
                }}
              >
                Select primary provider
              </Button>
            }
          />
        )}
        {hasActiveIntegration && stepErrorContent && (
          <NodeErrorPopover
            withinPortal
            withArrow
            opened={popoverOpened && Object.keys(stepErrorContent).length > 0}
            transition="rotate-left"
            transitionDuration={250}
            offset={theme.spacing.xs}
            position="right"
            zIndex={4}
            positionDependencies={[dragging, viewport]}
            clickOutsideEvents={MENU_CLICK_OUTSIDE_EVENTS}
            target={<ErrorCircle data-test-id="error-circle" dark={theme.colorScheme === 'dark'} />}
            title={stepErrorContent || 'Something is missing here'}
            content={
              `Please specify a ${(stepErrorContent as string)
                .replace(/(is|are) missing!/g, '')
                .toLowerCase()} to prevent sending empty notifications.` || 'Something is missing here'
            }
          />
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
      <SelectPrimaryIntegrationModal />
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
