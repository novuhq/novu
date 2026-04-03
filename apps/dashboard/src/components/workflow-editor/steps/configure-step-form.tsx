import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import {
  ApiServiceLevelEnum,
  EnvironmentTypeEnum,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  IEnvironment,
  ResourceOriginEnum,
  StepResponseDto,
  StepUpdateDto,
  UNLIMITED_VALUE,
  WorkflowResponseDto,
  getFeatureForTierAsNumber,
} from '@novu/shared';
import { FileCode2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { HTMLAttributes, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiArrowLeftSLine, RiArrowRightSLine, RiCloseFill, RiDeleteBin2Line, RiEdit2Line } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { PageMeta } from '@/components/page-meta';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { CopyButton } from '@/components/primitives/copy-button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRoot,
} from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { Separator } from '@/components/primitives/separator';
import { SidebarContent, SidebarFooter, SidebarHeader } from '@/components/side-navigation/sidebar';
import TruncatedText from '@/components/truncated-text';
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
import { UpgradeCTATooltip } from '@/components/upgrade-cta-tooltip';
import { UpdateWorkflowFn } from '@/components/workflow-editor/workflow-provider';
import { IS_SELF_HOSTED } from '@/config';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFormAutosave } from '@/hooks/use-form-autosave';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
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
                <SidebarContent>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel required>Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Untitled"
                            {...field}
                            disabled={isReadOnly}
                            hasError={!!fieldState.error}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={'stepId'}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Identifier</FormLabel>
                        <FormControl>
                          <Input
                            trailingNode={<CopyButton valueToCopy={field.value} />}
                            placeholder="Untitled"
                            className="cursor-default"
                            {...field}
                            readOnly
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SidebarContent>
                <Separator />

                {isInlineConfigurableStep && !hasCustomControls && !isInlineResolverActive && <InlineControlValues />}

                {isInlineResolverSupportedStep && !isInlineResolverActive && !isReadOnly && (
                  <SidebarContent>
                    {isAtCodeStepLimit ? (
                      <UpgradeCTATooltip description={codeStepLimitDescription} utmCampaign="code_steps_limit">
                        <span className="inline-flex w-full cursor-not-allowed">
                          <Button
                            variant="secondary"
                            mode="outline"
                            className="flex w-full cursor-not-allowed justify-start gap-1.5 text-xs font-medium opacity-60"
                            type="button"
                            disabled
                          >
                            <FileCode2 className="h-4 w-4 text-neutral-600" />
                            Resolve with custom code
                            <RiArrowRightSLine className="ml-auto h-4 w-4 text-neutral-600" />
                          </Button>
                        </span>
                      </UpgradeCTATooltip>
                    ) : (
                      <Button
                        variant="secondary"
                        mode="outline"
                        className="flex w-full justify-start gap-1.5 text-xs font-medium"
                        type="button"
                        onClick={() =>
                          navigate('./editor', { relative: 'path', state: { isPendingResolverActivation: true } })
                        }
                      >
                        <FileCode2 className="h-4 w-4 text-neutral-600" />
                        Resolve with custom code
                        <RiArrowRightSLine className="ml-auto h-4 w-4 text-neutral-600" />
                      </Button>
                    )}
                  </SidebarContent>
                )}

                {step.type === StepTypeEnum.HTTP_REQUEST && (
                  <SidebarContent>
                    <ContinueOnFailure />
                  </SidebarContent>
                )}
              </SaveFormContext.Provider>
            </FormRoot>
          </Form>

          {(isTemplateConfigurableStep || isInlineConfigurableStepWithCustomControls || isInlineResolverActive) && (
            <>
              <SidebarContent>
                <Link to="./editor" relative="path" state={{ stepType: step.type }}>
                  <Button
                    variant="secondary"
                    mode="outline"
                    className="flex w-full justify-start gap-1.5 text-xs font-medium"
                  >
                    <RiEdit2Line className="h-4 w-4 text-neutral-600" />
                    {step.type === StepTypeEnum.HTTP_REQUEST
                      ? 'Edit API request'
                      : `Edit ${STEP_TYPE_LABELS[step.type]} Step content`}
                    <RiArrowRightSLine className="ml-auto h-4 w-4 text-neutral-600" />
                  </Button>
                </Link>

                {environment.type === EnvironmentTypeEnum.DEV && (
                  <SkipConditionsButton origin={workflow.origin} step={step} />
                )}
              </SidebarContent>
              <Separator />

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
                        <Preview />
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
            </>
          )}

          {isInlineConfigurableStep && environment.type === EnvironmentTypeEnum.DEV && (
            <>
              <SidebarContent>
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
