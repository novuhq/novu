import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import {
  ApiServiceLevelEnum,
  EnvironmentTypeEnum,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
  IEnvironment,
  ResourceOriginEnum,
  StepResponseDto,
  StepUpdateDto,
  UNLIMITED_VALUE,
  WorkflowResponseDto,
} from '@novu/shared';
import { FileCode2, Hash } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { HTMLAttributes, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiArrowLeftSLine, RiArrowRightSLine, RiCloseFill, RiDeleteBin2Line, RiEdit2Line } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { PageMeta } from '@/components/page-meta';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { CopyButton } from '@/components/primitives/copy-button';
import { Form, FormField, FormItem, FormMessage, FormRoot } from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { Separator } from '@/components/primitives/separator';
import { SidebarContent, SidebarFooter, SidebarHeader } from '@/components/side-navigation/sidebar';
import TruncatedText from '@/components/truncated-text';
import { UpgradeCTATooltip } from '@/components/upgrade-cta-tooltip';
import { stepSchema } from '@/components/workflow-editor/schema';
import { flattenIssues, getFirstErrorMessage, updateStepInWorkflow } from '@/components/workflow-editor/step-utils';
import { ConfigureChatStepPreview } from '@/components/workflow-editor/steps/chat/configure-chat-step-preview';
import {
  ConfigureStepTemplateIssueCta,
  ConfigureStepTemplateIssuesContainer,
} from '@/components/workflow-editor/steps/configure-step-template-issue-cta';
import { DelayControlValues } from '@/components/workflow-editor/steps/delay/delay-control-values';
import { DigestControlValues } from '@/components/workflow-editor/steps/digest-delay-tabs/digest-control-values';
import { ConfigureEmailStepPreview } from '@/components/workflow-editor/steps/email/configure-email-step-preview';
import { ConfigureHttpRequestStepPreview } from '@/components/workflow-editor/steps/http-request/configure-http-request-step-preview';
import { ContinueOnFailure } from '@/components/workflow-editor/steps/http-request/continue-on-failure';
import { ConfigureInAppStepPreview } from '@/components/workflow-editor/steps/in-app/configure-in-app-step-preview';
import { ConfigurePushStepPreview } from '@/components/workflow-editor/steps/push/configure-push-step-preview';
import { SaveFormContext } from '@/components/workflow-editor/steps/save-form-context';
import { SdkBanner } from '@/components/workflow-editor/steps/sdk-banner';
import { SkipConditionsButton } from '@/components/workflow-editor/steps/skip-conditions-button';
import { ConfigureSmsStepPreview } from '@/components/workflow-editor/steps/sms/configure-sms-step-preview';
import { ThrottleControlValues } from '@/components/workflow-editor/steps/throttle/throttle-control-values';
import { UpdateWorkflowFn } from '@/components/workflow-editor/workflow-provider';
import { IS_SELF_HOSTED } from '@/config';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useFormAutosave } from '@/hooks/use-form-autosave';
import { useStepResolversCount } from '@/hooks/use-step-resolvers-count';
import {
  INLINE_CONFIGURABLE_STEP_TYPES,
  STEP_RESOLVER_SUPPORTED_STEP_TYPES,
  STEP_TYPE_LABELS,
  TEMPLATE_CONFIGURABLE_STEP_TYPES,
} from '@/utils/constants';
import { getControlsDefaultValues } from '@/utils/default-values';
import { StepTypeEnum } from '@/utils/enums';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { DEFAULT_STEP_ICON, STEP_TYPE_ICONS } from './constants/preview-context.constants';

const STEP_TYPE_TO_INLINE_CONTROL_VALUES: Record<StepTypeEnum, () => React.JSX.Element | null> = {
  [StepTypeEnum.DELAY]: DelayControlValues,
  [StepTypeEnum.DIGEST]: DigestControlValues,
  [StepTypeEnum.THROTTLE]: ThrottleControlValues,
  [StepTypeEnum.IN_APP]: () => null,
  [StepTypeEnum.EMAIL]: () => null,
  [StepTypeEnum.SMS]: () => null,
  [StepTypeEnum.CHAT]: () => null,
  [StepTypeEnum.PUSH]: () => null,
  [StepTypeEnum.CUSTOM]: () => null,
  [StepTypeEnum.HTTP_REQUEST]: () => null,
  [StepTypeEnum.TRIGGER]: () => null,
};

const STEP_TYPE_TO_PREVIEW: Record<StepTypeEnum, ((props: HTMLAttributes<HTMLDivElement>) => ReactNode) | null> = {
  [StepTypeEnum.IN_APP]: ConfigureInAppStepPreview,
  [StepTypeEnum.EMAIL]: ConfigureEmailStepPreview,
  [StepTypeEnum.SMS]: ConfigureSmsStepPreview,
  [StepTypeEnum.CHAT]: ConfigureChatStepPreview,
  [StepTypeEnum.PUSH]: ConfigurePushStepPreview,
  [StepTypeEnum.CUSTOM]: null,
  [StepTypeEnum.HTTP_REQUEST]: null,
  [StepTypeEnum.TRIGGER]: null,
  [StepTypeEnum.DIGEST]: null,
  [StepTypeEnum.DELAY]: null,
  [StepTypeEnum.THROTTLE]: null,
};

const CHANNEL_PREVIEW_STEP_TYPES = new Set<StepTypeEnum>([
  StepTypeEnum.IN_APP,
  StepTypeEnum.EMAIL,
  StepTypeEnum.SMS,
  StepTypeEnum.CHAT,
  StepTypeEnum.PUSH,
]);

const SIDEPANEL_ACTION_ROW_BASE_CLASS = 'flex h-12 w-full justify-start gap-1.5 rounded-none px-3 text-xs font-medium';

type ConfigureStepFormProps = {
  workflow: WorkflowResponseDto;
  environment: IEnvironment;
  step: StepResponseDto;
  update: UpdateWorkflowFn;
};

export const ConfigureStepForm = (props: ConfigureStepFormProps) => {
  const { step, workflow, update, environment } = props;
  const navigate = useNavigate();
  const isActionStepResolverEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_ACTION_STEP_RESOLVER_ENABLED);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const nameBeforeEditRef = useRef(step.name);
  const { subscription, isLoading: isSubscriptionLoading } = useFetchSubscription();
  const { data: stepResolversCountData, isLoading: isCountLoading } = useStepResolversCount();
  const supportedStepTypes = [
    StepTypeEnum.IN_APP,
    StepTypeEnum.SMS,
    StepTypeEnum.CHAT,
    StepTypeEnum.PUSH,
    StepTypeEnum.EMAIL,
    StepTypeEnum.DIGEST,
    StepTypeEnum.DELAY,
    StepTypeEnum.THROTTLE,
    StepTypeEnum.HTTP_REQUEST,
  ];

  const isSupportedStep = supportedStepTypes.includes(step.type);
  const isReadOnly =
    !isSupportedStep || workflow.origin === ResourceOriginEnum.EXTERNAL || environment.type !== EnvironmentTypeEnum.DEV;

  const isTemplateConfigurableStep = isSupportedStep && TEMPLATE_CONFIGURABLE_STEP_TYPES.includes(step.type);
  const isInlineConfigurableStep = isSupportedStep && INLINE_CONFIGURABLE_STEP_TYPES.includes(step.type);
  const isInlineResolverSupportedStep =
    isActionStepResolverEnabled && isInlineConfigurableStep && STEP_RESOLVER_SUPPORTED_STEP_TYPES.includes(step.type);
  const isInlineResolverActive = isInlineConfigurableStep && Boolean(step.stepResolverHash);

  const tier = subscription?.apiServiceLevel ?? ApiServiceLevelEnum.FREE;
  const codeStepLimit = getFeatureForTierAsNumber(FeatureNameEnum.PLATFORM_MAX_STEP_RESOLVERS, tier, false);
  const isUnlimited = codeStepLimit >= UNLIMITED_VALUE;
  const stepResolversCount = stepResolversCountData?.count;
  const isAtCodeStepLimit =
    !IS_SELF_HOSTED &&
    !isSubscriptionLoading &&
    !isCountLoading &&
    !isUnlimited &&
    !step.stepResolverHash &&
    stepResolversCount !== undefined &&
    stepResolversCount >= codeStepLimit;
  const codeStepLimitDescription =
    tier === ApiServiceLevelEnum.FREE
      ? `You've reached the ${codeStepLimit} code step limit on your Free plan. Upgrade to Pro for 10 code steps, or Business for unlimited.`
      : `You've reached the ${codeStepLimit} code step limit on your ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan. Upgrade to Business for unlimited code steps.`;

  const hasCustomControls = Object.keys(step.controls.dataSchema ?? {}).length > 0 && !step.controls.uiSchema;
  const isInlineConfigurableStepWithCustomControls = isInlineConfigurableStep && hasCustomControls;
  const showInlineControlValuesSection = isInlineConfigurableStep && !hasCustomControls && !isInlineResolverActive;
  const showHttpRequestFormMiddleSection = step.type === StepTypeEnum.HTTP_REQUEST;
  const showConfigureStepFormMiddleSection = showInlineControlValuesSection || showHttpRequestFormMiddleSection;

  const onDeleteStep = () => {
    update(
      {
        ...workflow,
        steps: workflow.steps.filter((s) => s._id !== step._id),
      },
      {
        onSuccess: () => {
          navigate(
            buildRoute(ROUTES.EDIT_WORKFLOW, { environmentSlug: environment.slug!, workflowSlug: workflow.slug })
          );
        },
      }
    );
  };

  const registerInlineControlValues = useMemo(() => {
    return (step: StepResponseDto) => {
      if (isInlineConfigurableStep) {
        return {
          controlValues: getControlsDefaultValues(step),
        };
      }

      if ((step.type as string) === StepTypeEnum.HTTP_REQUEST) {
        return {
          controlValues: {
            ...(step.controls.values ?? {}),
            continueOnFailure: (step.controls.values?.continueOnFailure as boolean) ?? false,
          },
        };
      }

      return {};
    };
  }, [isInlineConfigurableStep]);

  const defaultValues = useMemo(
    () => ({
      name: step.name,
      stepId: step.stepId,
      ...registerInlineControlValues(step),
    }),
    [step, registerInlineControlValues]
  );

  const form = useForm({
    defaultValues,
    shouldFocusError: false,
    resolver: standardSchemaResolver(stepSchema),
  });

  const { onBlur, saveForm, saveFormDebounced } = useFormAutosave({
    previousData: defaultValues,
    form,
    isReadOnly,
    shouldClientValidate: true,
    save: (data) => {
      // transform form fields to step update dto
      const updateStepData: Partial<StepUpdateDto> = {
        name: data.name,
        ...(data.controlValues ? { controlValues: data.controlValues } : {}),
      };
      update(updateStepInWorkflow(workflow, step.stepId, updateStepData));
    },
  });

  const firstControlsError = useMemo(
    () => (step.issues ? getFirstErrorMessage(step.issues, 'controls') : undefined),
    [step]
  );
  const firstIntegrationError = useMemo(
    () => (step.issues ? getFirstErrorMessage(step.issues, 'integration') : undefined),
    [step]
  );

  const setControlValuesIssues = useCallback(() => {
    // @ts-expect-error - isNew is set by useUpdateWorkflow, see that file for details
    if (step.isNew) {
      form.clearErrors();
      return;
    }

    const issues = flattenIssues(step.issues?.controls);
    const formValues = form.getValues() as unknown as Record<string, Record<string, unknown>>;
    const controlValues = formValues.controlValues ?? {};
    const formErrors = form.formState.errors as Record<string, Record<string, unknown>>;
    const setError = form.setError as (key: string, error: { message: string }) => void;
    const clearError = form.clearErrors as (key: string) => void;

    for (const key of new Set([...Object.keys(formErrors.controlValues ?? {}), ...Object.keys(issues)])) {
      const hasValue = controlValues[key] != null && controlValues[key] !== '';

      if (issues[key] && !hasValue) setError(`controlValues.${key}`, { message: issues[key] });
      else clearError(`controlValues.${key}`);
    }
  }, [form, step]);

  useEffect(() => {
    setControlValuesIssues();
  }, [setControlValuesIssues]);

  const Preview = STEP_TYPE_TO_PREVIEW[step.type];
  const InlineControlValues = STEP_TYPE_TO_INLINE_CONTROL_VALUES[step.type];
  const isChannelPreviewStep = CHANNEL_PREVIEW_STEP_TYPES.has(step.type);
  const httpRequestControlValues =
    step.type === StepTypeEnum.HTTP_REQUEST ? (step.controls.values as Record<string, unknown>) : null;

  const value = useMemo(() => ({ saveForm, saveFormDebounced }), [saveForm, saveFormDebounced]);

  return (
    <>
      <PageMeta title={`Configure ${step.name}`} />
      <AnimatePresence>
        <motion.div
          className="flex h-full w-full flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0.1 }}
          transition={{ duration: 0.1 }}
        >
          <SidebarHeader className="flex items-center gap-2.5 border-b py-3 text-sm font-medium">
            <Link
              to={buildRoute(ROUTES.EDIT_WORKFLOW, {
                environmentSlug: environment.slug!,
                workflowSlug: workflow.slug,
              })}
              className="flex items-center"
            >
              <CompactButton size="lg" variant="ghost" icon={RiArrowLeftSLine} className="size-4" type="button">
                <span className="sr-only">Back</span>
              </CompactButton>
            </Link>
            <span>Configure Step</span>
            <Link
              to={buildRoute(ROUTES.EDIT_WORKFLOW, {
                environmentSlug: environment.slug!,
                workflowSlug: workflow.slug,
              })}
              className="ml-auto flex items-center"
            >
              <CompactButton
                size="lg"
                variant="ghost"
                icon={RiCloseFill}
                className="size-4"
                type="button"
                data-testid="configure-step-form-close"
              >
                <span className="sr-only">Close</span>
              </CompactButton>
            </Link>
          </SidebarHeader>
          <Form {...form}>
            <FormRoot onBlur={onBlur}>
              <SaveFormContext.Provider value={value}>
                <SidebarContent size="md">
                  {/* STEP Section */}
                  <FormField
                    control={form.control}
                    name="name"
                    defaultValue=""
                    render={({ field, fieldState }) => {
                      const StepIcon = STEP_TYPE_ICONS[step.type] || DEFAULT_STEP_ICON;
                      return (
                        <FormItem>
                          <div className="group flex items-center justify-between gap-6">
                            <div className="flex items-center gap-1.5">
                              <StepIcon className="text-text-soft h-3.5 w-3.5 shrink-0" />
                              <span className="text-text-soft font-code text-xs font-medium">STEP</span>
                            </div>
                            <div className="relative flex items-center min-w-0 flex-1 justify-end h-8">
                              <AnimatePresence mode="wait">
                                {isEditingName && !isReadOnly ? (
                                  <motion.div
                                    key="input"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    className="absolute inset-0 flex items-center"
                                  >
                                    <Input
                                      placeholder="Step name"
                                      value={field.value}
                                      onChange={field.onChange}
                                      hasError={!!fieldState.error}
                                      maxLength={64}
                                      className="w-full text-right whitespace-nowrap overflow-x-hidden mask-none"
                                      size="xs"
                                      autoFocus
                                      onBlur={() => {
                                        field.onBlur();

                                        if (!field.value?.trim()) {
                                          field.onChange(nameBeforeEditRef.current);
                                          setIsEditingName(false);

                                          return;
                                        }

                                        setIsEditingName(false);
                                        saveForm();
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          if (field.value?.trim()) {
                                            e.currentTarget.blur();
                                          } else {
                                            field.onChange(nameBeforeEditRef.current);
                                            setIsEditingName(false);
                                          }
                                        }
                                        if (e.key === 'Escape') {
                                          form.resetField('name');
                                          setIsEditingName(false);
                                        }
                                      }}
                                    />
                                  </motion.div>
                                ) : (
                                  <motion.button
                                    key="button"
                                    type="button"
                                    onClick={() => {
                                      if (isReadOnly) {
                                        return;
                                      }

                                      const current = field.value ?? '';
                                      nameBeforeEditRef.current = current.trim() ? current : step.name;

                                      setIsEditingName(true);
                                    }}
                                    disabled={isReadOnly}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    whileHover={!isReadOnly ? { x: 2 } : {}}
                                    whileTap={!isReadOnly ? { scale: 0.98 } : {}}
                                    className={cn(
                                      'text-foreground-600 text-right text-label-xs transition-colors h-8 flex items-center justify-end w-full min-w-0',
                                      !isReadOnly && 'hover:text-foreground-800 cursor-pointer',
                                      isReadOnly && 'cursor-default'
                                    )}
                                  >
                                    <span className="block w-full min-w-0 truncate text-right">
                                      {field.value || 'Untitled step'}
                                    </span>
                                  </motion.button>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  {/* ID Section */}
                  <FormField
                    control={form.control}
                    name="stepId"
                    defaultValue=""
                    render={({ field }) => (
                      <FormItem>
                        <div className="group flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Hash className="text-text-soft h-3.5 w-3.5 shrink-0" />
                            <span className="text-text-soft font-code text-xs font-medium">ID</span>
                          </div>
                          <div className="relative flex items-center gap-2">
                            <div className="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                              <CopyButton valueToCopy={field.value} size="2xs" className="h-1 p-0.5" />
                            </div>
                            <motion.span
                              whileHover={{ x: -2 }}
                              transition={{ duration: 0.15 }}
                              className="text-foreground-600 text-right text-label-xs"
                            >
                              {field.value}
                            </motion.span>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                </SidebarContent>
                <Separator />

                {showInlineControlValuesSection && <InlineControlValues />}

                {showHttpRequestFormMiddleSection && (
                  <SidebarContent>
                    <ContinueOnFailure />
                  </SidebarContent>
                )}
              </SaveFormContext.Provider>
              {showConfigureStepFormMiddleSection && <Separator />}
            </FormRoot>
          </Form>

          {(isTemplateConfigurableStep || isInlineConfigurableStepWithCustomControls || isInlineResolverActive) && (
            <>
              {firstControlsError || firstIntegrationError ? (
                <>
                  <ConfigureStepTemplateIssuesContainer>
                    {firstControlsError && (
                      <ConfigureStepTemplateIssueCta step={step} issue={firstControlsError} type="error" />
                    )}
                    {firstIntegrationError && (
                      <ConfigureStepTemplateIssueCta step={step} issue={firstIntegrationError} type="info" />
                    )}
                  </ConfigureStepTemplateIssuesContainer>
                  <Separator />
                </>
              ) : (
                <>
                  {Preview && (
                    <>
                      <SidebarContent>
                        {isChannelPreviewStep ? (
                          <div className="relative">
                            <Link
                              to="./editor"
                              relative="path"
                              state={{ stepType: step.type }}
                              className="peer absolute inset-0 z-20 rounded-lg"
                              aria-label="Open full preview"
                            />
                            <div className="pointer-events-none relative z-10">
                              <Preview />
                            </div>
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-20 rounded-b-lg bg-linear-to-b from-transparent via-bg-white/75 to-bg-white opacity-0 transition-opacity duration-200 peer-hover:opacity-100 peer-focus:opacity-100" />
                            <div className="pointer-events-none absolute inset-x-2 bottom-2 z-30 flex justify-center opacity-0 transition-opacity duration-200 peer-hover:opacity-100 peer-focus:opacity-100">
                              <span className="border-neutral-alpha-200 bg-bg-white text-foreground-600 inline-flex h-8 items-center gap-1 rounded-md border border-solid px-3 text-xs font-medium shadow-xs">
                                View full preview <RiArrowRightSLine className="size-3.5 shrink-0" />
                              </span>
                            </div>
                          </div>
                        ) : (
                          <Preview />
                        )}
                      </SidebarContent>
                      <Separator />
                    </>
                  )}
                  {step.type === StepTypeEnum.HTTP_REQUEST && httpRequestControlValues && (
                    <>
                      <SidebarContent>
                        <ConfigureHttpRequestStepPreview controlValues={httpRequestControlValues} />
                      </SidebarContent>
                      <Separator />
                    </>
                  )}
                </>
              )}

              <SidebarContent size="lg" className="gap-0 px-0 py-0">
                <Link to="./editor" relative="path" state={{ stepType: step.type }} className="block">
                  <Button
                    variant="secondary"
                    mode="ghost"
                    className={cn(SIDEPANEL_ACTION_ROW_BASE_CLASS, 'border-b border-stroke-weak')}
                    leadingIcon={RiEdit2Line}
                    trailingIcon={RiArrowRightSLine}
                  >
                    {step.type === StepTypeEnum.HTTP_REQUEST
                      ? 'Edit API request'
                      : `Edit ${STEP_TYPE_LABELS[step.type]} Step content`}
                    <span className="ml-auto" />
                  </Button>
                </Link>

                {environment.type === EnvironmentTypeEnum.DEV && !isInlineConfigurableStep && (
                  <SkipConditionsButton origin={workflow.origin} step={step} />
                )}
              </SidebarContent>
              <Separator />
            </>
          )}

          {isInlineResolverSupportedStep && !isInlineResolverActive && !isReadOnly && (
            <SidebarContent size="lg" className="gap-0 px-0 py-0">
              {isAtCodeStepLimit ? (
                <UpgradeCTATooltip description={codeStepLimitDescription} utmCampaign="code_steps_limit">
                  <span className="inline-flex w-full cursor-not-allowed">
                    <Button
                      variant="secondary"
                      mode="ghost"
                      className={cn(
                        SIDEPANEL_ACTION_ROW_BASE_CLASS,
                        'cursor-not-allowed border-b border-stroke-soft opacity-60'
                      )}
                      type="button"
                      disabled
                      trailingIcon={RiArrowRightSLine}
                    >
                      <FileCode2 className="size-4 shrink-0" />
                      Resolve with custom code
                      <span className="ml-auto" />
                    </Button>
                  </span>
                </UpgradeCTATooltip>
              ) : (
                <Button
                  variant="secondary"
                  mode="ghost"
                  className={cn(SIDEPANEL_ACTION_ROW_BASE_CLASS, 'border-b border-stroke-soft')}
                  type="button"
                  onClick={() =>
                    navigate('./editor', { relative: 'path', state: { isPendingResolverActivation: true } })
                  }
                  trailingIcon={RiArrowRightSLine}
                >
                  <FileCode2 className="size-4 shrink-0" />
                  Resolve with custom code
                  <span className="ml-auto" />
                </Button>
              )}
            </SidebarContent>
          )}

          {isInlineConfigurableStep && environment.type === EnvironmentTypeEnum.DEV && (
            <>
              <SidebarContent size="lg" className="gap-0 px-0 py-0">
                <SkipConditionsButton origin={workflow.origin} step={step} />
              </SidebarContent>
              <Separator />
            </>
          )}

          {!isSupportedStep && (
            <SidebarContent>
              <SdkBanner />
            </SidebarContent>
          )}

          {!isReadOnly && (
            <SidebarFooter>
              <ConfirmationModal
                open={isDeleteModalOpen}
                onOpenChange={setIsDeleteModalOpen}
                onConfirm={onDeleteStep}
                title="Proceeding will delete the step"
                description={
                  <>
                    You're about to delete the{' '}
                    <TruncatedText className="max-w-[32ch] font-semibold">{step.name}</TruncatedText> step, this action
                    is permanent.
                  </>
                }
                confirmButtonText="Delete"
                confirmButtonVariant="error"
              />
              <Button
                variant="error"
                mode="ghost"
                className="gap-1.5"
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                leadingIcon={RiDeleteBin2Line}
              >
                Delete step
              </Button>
            </SidebarFooter>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
};
