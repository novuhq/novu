import styled from '@emotion/styled';
import { Divider, Group, useMantineColorScheme } from '@mantine/core';
import { ChannelTypeEnum, providers, StepTypeEnum } from '@novu/shared';
import React, { MouseEventHandler, useEffect, useState } from 'react';
import { useViewport } from 'react-flow-renderer';
import { useFormContext } from 'react-hook-form';

import {
  Button,
  colors,
  IDropdownProps,
  ProviderMissing,
  Text,
  useTemplateButtonStyles,
  VariantsFile,
  ErrorIcon,
} from '@novu/design-system';
import { useSegment } from '../../../../../components/providers/SegmentProvider';
import { When } from '../../../../../components/utils/When';
import { CONTEXT_PATH } from '../../../../../config';
import { useEnvController, useGetPrimaryIntegration, useHasActiveIntegrations } from '../../../../../hooks';
import { CHANNEL_TYPE_TO_STRING } from '../../../../../utils/channels';
import { useSelectPrimaryIntegrationModal } from '../../../../integrations/components/multi-provider/useSelectPrimaryIntegrationModal';
import { IntegrationsListModal } from '../../../../integrations/IntegrationsListModal';
import { TemplateEditorAnalyticsEnum } from '../../../constants';
import { getFormattedStepErrors, hasGroupError } from '../../../shared/errors';
import { DisplayPrimaryProviderIcon } from '../../DisplayPrimaryProviderIcon';
import { NodeErrorPopover } from '../../NodeErrorPopover';
import { NODE_ERROR_TYPES } from './utils';
import { WorkflowNodeActions } from './WorkflowNodeActions';
import { useTemplateEditorForm } from '../../../components/TemplateEditorFormProvider';

export type NodeType = 'step' | 'stepRoot' | 'variant' | 'variantRoot';

interface IWorkflowNodeProps {
  Icon: React.FC<any>;
  label: string;
  active?: boolean;
  testId?: string;
  tabKey?: ChannelTypeEnum;
  channelType: StepTypeEnum;
  changeTab?: (string) => void;
  errors?: boolean | string;
  id?: string;
  index?: number;
  onClick?: MouseEventHandler<HTMLDivElement>;
  onDelete?: () => void;
  onAddVariant?: () => void;
  onEdit?: MouseEventHandler<HTMLButtonElement>;
  onAddConditions?: MouseEventHandler<HTMLButtonElement>;
  dragging?: boolean;
  disabled?: boolean;
  variantsCount?: number;
  conditionsCount?: number;
  subtitle?: string | React.ReactNode;
  className?: string;
  menuPosition?: IDropdownProps['position'];
  nodeType?: NodeType;
  nodeErrorType?: NODE_ERROR_TYPES;
}

const MENU_CLICK_OUTSIDE_EVENTS = ['click', 'mousedown', 'touchstart'];

export function WorkflowNode({
  active = false,
  label,
  Icon,
  tabKey,
  channelType,
  index,
  testId,
  errors: initialErrors = false,
  variantsCount = 0,
  conditionsCount = 0,
  id = undefined,
  onClick,
  onDelete,
  onAddVariant,
  onEdit,
  onAddConditions,
  dragging = false,
  disabled: initDisabled,
  subtitle,
  className,
  menuPosition,
  nodeType = 'step',
  nodeErrorType,
}: IWorkflowNodeProps) {
  const segment = useSegment();

  const { template } = useTemplateEditorForm();
  const { readonly: readonlyEnv, environment, chimera } = useEnvController({}, template?.chimera);
  const { cx, classes, theme } = useTemplateButtonStyles();
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [disabled, setDisabled] = useState(initDisabled);
  const [isIntegrationsModalVisible, setIntegrationsModalVisible] = useState(false);
  const disabledColor = disabled ? { color: theme.colorScheme === 'dark' ? colors.B40 : colors.B70 } : {};
  const disabledProp = disabled ? { disabled: disabled } : {};
  const isStepRoot = nodeType === 'stepRoot';
  const isVariant = nodeType === 'variant';
  const isVariantRoot = nodeType === 'variantRoot';

  const viewport = useViewport();
  const channelKey = tabKey ?? '';
  const [hover, setHover] = useState(false);
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
  let showGroupError = false;
  if (typeof index === 'number') {
    stepErrorContent = getFormattedStepErrors(index, errors);
    showGroupError = isStepRoot && hasGroupError(index, errors);
  }

  const showMenu = !dragging && hover;

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
      <WorkflowNodeButton
        role={'button'}
        onClick={onClick}
        onMouseEnter={() => {
          setPopoverOpened(true);
          setHover(true);
        }}
        onMouseLeave={() => {
          setPopoverOpened(false);
          setHover(false);
        }}
        data-test-id={testId}
        className={cx(
          className,
          classes.button,
          { [classes.active]: active },
          { [classes.variant]: isStepRoot },
          { [classes.variantRoot]: isVariantRoot && !active }
        )}
      >
        <WorkflowNodeWrapper>
          <When truthy={isStepRoot}>
            <NodeErrorPopover
              withinPortal
              opened={popoverOpened && showGroupError}
              transition="rotate-left"
              transitionDuration={250}
              offset={theme.spacing.xs}
              positionDependencies={[dragging, viewport]}
              clickOutsideEvents={MENU_CLICK_OUTSIDE_EVENTS}
              target={
                <ActionWrapper showGroupError={showGroupError}>
                  {showGroupError ? (
                    <Group spacing={4} position="left" noWrap>
                      <ErrorIcon color={colors.error} style={{ width: '16px', minWidth: '16px', height: '16px' }} />
                      <Text color={colors.error} rows={1} weight="bold">
                        Some variants contain errors
                      </Text>
                    </Group>
                  ) : (
                    <IconText
                      color={colors.B60}
                      Icon={VariantsFile}
                      label={
                        <>
                          {variantsCount} <span style={{ fontSize: '12px' }}>variants</span>
                        </>
                      }
                      data-test-id="variants-count"
                    />
                  )}
                  <WorkflowNodeActions
                    nodeType={nodeType}
                    showMenu={showMenu}
                    isReadOnly={readonlyEnv}
                    menuPosition={menuPosition}
                    conditionsCount={conditionsCount}
                    channelType={channelType}
                    onEdit={onEdit}
                    onAddConditions={onAddConditions}
                    onAddVariant={onAddVariant}
                    onDelete={onDelete}
                  />
                </ActionWrapper>
              }
              position="left"
              title="The group contains error!"
              content="Some variants contain errors that may cause notification failure."
            />

            <Divider
              ml={-7}
              mr={-7}
              size={2}
              my={0}
              variant={'dashed'}
              color={colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
            />
          </When>

          <BodyWrapper>
            <DisplayPrimaryProviderIcon
              Icon={Icon}
              disabledProp={disabledProp}
              providerIntegration={providerIntegration}
              isChannelStep={isChannelStep}
              logoSrc={logoSrc}
            />

            <StyledContentWrapper>
              <Text {...disabledColor} weight="bold" rows={1} size={16} data-test-id="workflow-node-label">
                {label}
              </Text>

              {Object.keys(stepErrorContent).length > 0 && !chimera && (
                <Text {...disabledColor} size={12} color={colors.error} rows={1} data-test-id="workflow-node-error">
                  {stepErrorContent}
                </Text>
              )}
              {!(Object.keys(stepErrorContent).length > 0) && !chimera && subtitle && (
                <Text {...disabledColor} size={12} color={colors.B60} rows={1} data-test-id="workflow-node-subtitle">
                  {subtitle}
                </Text>
              )}
            </StyledContentWrapper>

            <When truthy={!isStepRoot}>
              <ActionTopWrapper>
                <WorkflowNodeActions
                  nodeType={nodeType}
                  showMenu={showMenu}
                  isReadOnly={readonlyEnv}
                  menuPosition={menuPosition}
                  conditionsCount={conditionsCount}
                  channelType={channelType}
                  onEdit={onEdit}
                  onAddConditions={onAddConditions}
                  onAddVariant={onAddVariant}
                  onDelete={onDelete}
                />
              </ActionTopWrapper>
            </When>
          </BodyWrapper>
        </WorkflowNodeWrapper>
        {!showGroupError && (
          <>
            {((isVariantRoot && nodeErrorType === NODE_ERROR_TYPES.MISSING_PROVIDER) ||
              (!hasActiveIntegration && !isVariant && !nodeErrorType)) && (
              <NodeErrorPopover
                opened={popoverOpened}
                withinPortal
                transition="rotate-left"
                transitionDuration={250}
                offset={theme.spacing.xs}
                target={
                  <ErrorCircle
                    data-test-id="error-circle"
                    dark={theme.colorScheme === 'dark'}
                    alignment={isVariant || isVariantRoot ? 'left' : 'right'}
                  />
                }
                position={isVariant || isVariantRoot ? 'left' : 'right'}
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
            {((isVariantRoot && nodeErrorType === NODE_ERROR_TYPES.MISSING_PRIMARY_PROVIDER) ||
              (hasActiveIntegration && !primaryIntegration && isPrimaryStep && !isVariant)) && (
              <NodeErrorPopover
                opened={popoverOpened}
                withinPortal
                transition="rotate-left"
                transitionDuration={250}
                offset={theme.spacing.xs}
                target={
                  <ErrorCircle
                    data-test-id="error-circle"
                    dark={theme.colorScheme === 'dark'}
                    alignment={isVariant || isVariantRoot ? 'left' : 'right'}
                  />
                }
                position={isVariant || isVariantRoot ? 'left' : 'right'}
                titleIcon={<ProviderMissing />}
                title="Select primary provider"
                content={
                  'You have multiple provider instances for ' +
                  CHANNEL_TYPE_TO_STRING[channelKey] +
                  ` in the ${environment?.name} environment. Please select the primary instance.
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

            {((isVariantRoot && nodeErrorType === NODE_ERROR_TYPES.TEMPLATE_ERROR) ||
              isVariant ||
              hasActiveIntegration) &&
              stepErrorContent &&
              !chimera && (
                <NodeErrorPopover
                  withinPortal
                  opened={popoverOpened && Object.keys(stepErrorContent).length > 0}
                  transition="rotate-left"
                  transitionDuration={250}
                  offset={theme.spacing.xs}
                  positionDependencies={[dragging, viewport]}
                  clickOutsideEvents={MENU_CLICK_OUTSIDE_EVENTS}
                  target={
                    <ErrorCircle
                      data-test-id="error-circle"
                      dark={theme.colorScheme === 'dark'}
                      alignment={isVariant || isVariantRoot ? 'left' : 'right'}
                    />
                  }
                  position={isVariant || isVariantRoot ? 'left' : 'right'}
                  title={stepErrorContent || 'Something is missing here'}
                  content={
                    `Please specify a ${(stepErrorContent as string)
                      .replace(/(is|are) missing!/g, '')
                      .toLowerCase()} to prevent sending empty notifications.` || 'Something is missing here'
                  }
                />
              )}
          </>
        )}
      </WorkflowNodeButton>
      <IntegrationsListModal isOpen={isIntegrationsModalVisible} onClose={onIntegrationModalClose} scrollTo={tabKey} />
      <SelectPrimaryIntegrationModal />
    </>
  );
}

const IconText = ({
  color,
  label,
  Icon,
  ['data-test-id']: dataTestId,
}: {
  color?: string;
  label: any;
  Icon: React.FC<any>;
  'data-test-id'?: string;
}) => {
  return (
    <IconTextWrapper data-test-id={dataTestId}>
      <Icon color={color} width="20px" height="20px" />
      <Text color={color} weight={'bold'} size={14}>
        {label}
      </Text>
    </IconTextWrapper>
  );
};

const IconTextWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 28px;
`;

const WorkflowNodeWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const ErrorCircle = styled.div<{ dark: boolean; alignment: 'left' | 'right' }>`
  width: 11px;
  height: 11px;
  display: inline-block;
  position: absolute;
  ${({ alignment }) => alignment}: -6px;
  top: calc(50% - 4px);
  background: ${colors.error};
  border-radius: 50%;
  border: 3px solid ${({ dark }) => (dark ? colors.B15 : 'white')};
`;

const ActionWrapper = styled.div<{ showGroupError?: boolean }>`
  display: flex;
  align-items: center;
  height: 40px;
  padding: 4px 12px;
  border-top-right-radius: 7px;
  border-top-left-radius: 7px;
  background: ${({ theme, showGroupError }) =>
    showGroupError && theme.colorScheme === 'dark' ? `${colors.errorGradient}, ${colors.B17}` : 'transparent'};
`;

const ActionTopWrapper = styled(ActionWrapper)`
  align-self: flex-start;
`;

const BodyWrapper = styled.div`
  display: flex;
  flex: 1 1 auto;
  gap: 16px;
  height: 80px;
  padding-left: 20px;
  align-items: center;
`;

const StyledContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
  justify-content: flex-start;
  width: 100%;
  flex: 1;
  padding-right: 20px;
`;

const WorkflowNodeButton = styled.div`
  display: flex;
  justify-content: space-between;
  position: relative;
  pointer-events: all;
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B17 : colors.white)};
  width: 280px;
`;
