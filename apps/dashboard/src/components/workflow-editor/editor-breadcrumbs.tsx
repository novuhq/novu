import { ResourceOriginEnum, StepResponseDto, WorkflowResponseDto } from '@novu/shared';
import React from 'react';
import { FaCode } from 'react-icons/fa6';
import { RiArrowDownSLine, RiArrowLeftSLine } from 'react-icons/ri';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { RouteFill } from '@/components/icons';
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
import { STEP_TYPE_LABELS, TEMPLATE_CONFIGURABLE_STEP_TYPES } from '@/utils/constants';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { SavingStatusIndicator } from './saving-status-indicator';
import { getStepTypeIcon } from './steps/utils/preview-context.utils';
import { useWorkflow } from './workflow-provider';

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
  const Icon = getStepTypeIcon(step.type);
  const { isUpdatePatchPending, lastSaveError, workflow } = useWorkflow();
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const steps = workflow?.steps ?? [];
  const hasMultipleSteps = steps.length > 1;

  function handleStepSwitch(targetStep: StepResponseDto) {
    if (!workflow || !currentEnvironment?.slug) return;
    if (targetStep.slug === step.slug) return;

    const basePath =
      buildRoute(ROUTES.EDIT_WORKFLOW, {
        environmentSlug: currentEnvironment.slug,
        workflowSlug: workflow.slug,
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
            <DropdownMenuTrigger className="flex cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 hover:bg-neutral-100">
              <Icon className="size-3.5" />
              <div className="flex max-w-[32ch]">
                <TruncatedText>{step.name || STEP_TYPE_LABELS[step.type]}</TruncatedText>
              </div>
              <RiArrowDownSLine className="size-4 text-neutral-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[180px]">
              {steps.map((s) => {
                const StepIcon = getStepTypeIcon(s.type);
                const isCurrentStep = s.slug === step.slug;

                return (
                  <DropdownMenuItem
                    key={s._id}
                    onClick={() => handleStepSwitch(s)}
                    className={cn('flex cursor-pointer items-center gap-2', isCurrentStep && 'bg-neutral-alpha-50')}
                  >
                    <StepIcon className="size-3.5 shrink-0" />
                    <span className={cn('truncate', isCurrentStep && 'font-semibold')}>
                      {s.name || STEP_TYPE_LABELS[s.type]}
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Icon className="size-3.5" />
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
