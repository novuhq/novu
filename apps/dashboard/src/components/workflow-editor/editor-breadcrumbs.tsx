import { ResourceOriginEnum, StepResponseDto, WorkflowResponseDto } from '@novu/shared';
import React from 'react';
import { FaCode } from 'react-icons/fa6';
import { RiArrowLeftSLine, RiCheckLine, RiExpandUpDownLine } from 'react-icons/ri';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { RouteFill } from '@/components/icons';
import { STEP_TYPE_TO_ICON } from '@/components/icons/utils';
import { Badge } from '@/components/primitives/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/primitives/breadcrumb';
import { CompactButton } from '@/components/primitives/button-compact';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import TruncatedText from '@/components/truncated-text';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchWorkflow } from '@/hooks/use-fetch-workflow';
import type { ProviderColorToken } from '@/utils/color';
import { STEP_TYPE_TO_COLOR } from '@/utils/color';
import { STEP_TYPE_LABELS, TEMPLATE_CONFIGURABLE_STEP_TYPES } from '@/utils/constants';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { SavingStatusIndicator } from './saving-status-indicator';
import { useWorkflow } from './workflow-provider';

const COLOR_TOKEN_TO_TEXT: Record<ProviderColorToken, string> = {
  neutral: 'text-neutral-400',
  stable: 'text-stable/30',
  information: 'text-information/30',
  feature: 'text-feature/30',
  destructive: 'text-destructive/30',
  verified: 'text-verified/30',
  alert: 'text-alert/30',
  highlighted: 'text-highlighted/30',
  warning: 'text-warning/30',
};

type BreadcrumbData = {
  label: string;
  href: string;
};

export function EditorBreadcrumbs() {
  const { workflowSlug = '', stepSlug = '' } = useParams<{
    workflowSlug: string;
    stepSlug?: string;
  }>();
  const { currentEnvironment } = useEnvironment();
  const navigate = useNavigate();
  const location = useLocation();
  const isNewWorkflowSlug = workflowSlug === 'new';
  const { workflow } = useFetchWorkflow({ workflowSlug: !isNewWorkflowSlug ? workflowSlug : undefined });
  const { step } = useWorkflow();

  const workflowsRoute = buildRoute(ROUTES.WORKFLOWS, {
    environmentSlug: currentEnvironment?.slug ?? '',
  });

  const isOnStepRoute = isOnStepEditingRoute(stepSlug, location.pathname) && step;

  const breadcrumbs: BreadcrumbData[] = [
    {
      label: currentEnvironment?.name || '',
      href: workflowsRoute,
    },
    {
      label: 'Workflows',
      href: workflowsRoute,
    },
  ];

  if (workflow) {
    const workflowRoute = buildRoute(ROUTES.EDIT_WORKFLOW, {
      environmentSlug: currentEnvironment?.slug ?? '',
      workflowSlug: workflow.slug,
    });
    breadcrumbs.push({
      label: workflow.name,
      href: workflowRoute,
    });
  }

  const handleBackNavigation = () => {
    if (isOnStepRoute && workflow) {
      navigate(
        buildRoute(ROUTES.EDIT_WORKFLOW, {
          environmentSlug: currentEnvironment?.slug ?? '',
          workflowSlug: workflow.slug,
        })
      );
    } else {
      navigate(workflowsRoute);
    }
  };

  return (
    <div className="flex items-center overflow-hidden">
      <CompactButton
        size="lg"
        className="mr-1"
        variant="ghost"
        icon={RiArrowLeftSLine}
        onClick={handleBackNavigation}
      />
      {currentEnvironment && (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItems breadcrumbs={breadcrumbs} workflow={workflow} isOnStepRoute={!!isOnStepRoute} />
            {isOnStepRoute && step && <StepBreadcrumb step={step} />}
          </BreadcrumbList>
        </Breadcrumb>
      )}
    </div>
  );
}

function isOnStepEditingRoute(stepSlug: string | undefined, pathname: string): boolean {
  return Boolean(
    stepSlug && (pathname.includes('/edit') || pathname.includes('/editor') || pathname.includes('/conditions'))
  );
}

function WorkflowIcon({ origin }: { origin: ResourceOriginEnum }) {
  if (origin === ResourceOriginEnum.EXTERNAL) {
    return (
      <Badge color="yellow" size="sm" variant="lighter">
        <FaCode className="size-3.5" />
      </Badge>
    );
  }

  return <RouteFill className="size-4" />;
}

function WorkflowBreadcrumbContent({
  workflow,
  label,
  showSavingIndicator,
}: {
  workflow: WorkflowResponseDto;
  label: string;
  showSavingIndicator?: boolean;
}) {
  const { isUpdatePatchPending, lastSaveError } = useWorkflow();

  return (
    <div className="flex items-center gap-1">
      <WorkflowIcon origin={workflow.origin} />
      <div className="flex max-w-[32ch]">
        <TruncatedText>{label}</TruncatedText>
      </div>
      {showSavingIndicator && <SavingStatusIndicator isSaving={isUpdatePatchPending} hasError={!!lastSaveError} />}
    </div>
  );
}

function StepBreadcrumb({ step }: { step: StepResponseDto }) {
  const Icon = STEP_TYPE_TO_ICON[step.type];
  const { isUpdatePatchPending, lastSaveError, workflow } = useWorkflow();
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const { workflowSlug = '' } = useParams<{ workflowSlug: string }>();
  const steps = workflow?.steps ?? [];
  const hasMultipleSteps = steps.length > 1;

  function handleStepSwitch(targetStep: StepResponseDto) {
    if (!workflow || !currentEnvironment?.slug) return;
    if (targetStep.slug === step.slug) return;

    const basePath =
      buildRoute(ROUTES.EDIT_WORKFLOW, {
        environmentSlug: currentEnvironment.slug,
        workflowSlug,
      }) + `/steps/${targetStep.slug}`;

    const isTemplateConfigurable = TEMPLATE_CONFIGURABLE_STEP_TYPES.includes(targetStep.type);
    const finalPath = isTemplateConfigurable ? `${basePath}/editor` : basePath;

    navigate(finalPath);
  }

  return (
    <BreadcrumbItem>
      <BreadcrumbPage className="flex items-center gap-1">
        {hasMultipleSteps ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-6 max-w-[34ch] cursor-pointer items-center gap-1 rounded-md border border-transparent px-1.5 text-xs transition-colors hover:border-neutral-alpha-200 hover:bg-neutral-alpha-50 data-[state=open]:border-neutral-alpha-200 data-[state=open]:bg-neutral-alpha-50">
              <Icon className="text-foreground-950 size-3.5 shrink-0" />
              <span className="text-foreground-950 truncate font-medium">
                {step.name || STEP_TYPE_LABELS[step.type]}
              </span>
              <RiExpandUpDownLine className="text-foreground-400 size-3 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[220px] max-w-[280px] p-1">
              {steps.map((s) => {
                const StepIcon = STEP_TYPE_TO_ICON[s.type];
                const isCurrentStep = s.slug === step.slug;

                return (
                  <DropdownMenuItem
                    key={s._id}
                    onSelect={() => handleStepSwitch(s)}
                    className={cn(
                      'flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0 text-xs leading-none',
                      isCurrentStep && 'bg-bg-weak'
                    )}
                  >
                    <StepIcon className={cn('size-3.5 shrink-0', COLOR_TOKEN_TO_TEXT[STEP_TYPE_TO_COLOR[s.type]])} />
                    <span className="truncate">{s.name || STEP_TYPE_LABELS[s.type]}</span>
                    {isCurrentStep ? <RiCheckLine className="text-foreground-600 ml-auto size-3.5 shrink-0" /> : null}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Icon className="text-foreground-950 size-4" />
            <div className="flex max-w-[32ch]">
              <TruncatedText>{step.name || STEP_TYPE_LABELS[step.type]}</TruncatedText>
            </div>
          </>
        )}
        <SavingStatusIndicator isSaving={isUpdatePatchPending} hasError={!!lastSaveError} />
      </BreadcrumbPage>
    </BreadcrumbItem>
  );
}

function BreadcrumbItems({
  breadcrumbs,
  workflow,
  isOnStepRoute,
}: {
  breadcrumbs: BreadcrumbData[];
  workflow: WorkflowResponseDto | undefined;
  isOnStepRoute: boolean;
}) {
  return (
    <>
      {breadcrumbs.map(({ label, href }, index) => {
        const isLastItem = index === breadcrumbs.length - 1;
        const isWorkflowBreadcrumb = isLastItem && workflow;
        const shouldShowAsPage = isLastItem && !isOnStepRoute;

        return (
          <React.Fragment key={`${href}_${label}`}>
            <BreadcrumbItem className="flex items-center gap-1">
              {shouldShowAsPage ? (
                <BreadcrumbPage className="flex items-center gap-1">
                  {isWorkflowBreadcrumb ? (
                    <WorkflowBreadcrumbContent workflow={workflow} label={label} showSavingIndicator={!isOnStepRoute} />
                  ) : (
                    label
                  )}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink to={href}>
                  {isWorkflowBreadcrumb ? (
                    <WorkflowBreadcrumbContent workflow={workflow} label={label} showSavingIndicator={!isOnStepRoute} />
                  ) : (
                    label
                  )}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {(!isLastItem || isOnStepRoute) && <BreadcrumbSeparator />}
          </React.Fragment>
        );
      })}
    </>
  );
}
