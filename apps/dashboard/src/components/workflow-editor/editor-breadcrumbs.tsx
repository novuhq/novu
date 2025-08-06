import { ResourceOriginEnum, StepResponseDto, WorkflowResponseDto } from '@novu/shared';
import React from 'react';
import { FaCode } from 'react-icons/fa6';
import { RiArrowLeftSLine } from 'react-icons/ri';
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
import TruncatedText from '@/components/truncated-text';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchWorkflow } from '@/hooks/use-fetch-workflow';
import { STEP_TYPE_LABELS } from '@/utils/constants';
import { buildRoute, ROUTES } from '@/utils/routes';
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
  const { workflow } = useFetchWorkflow({ workflowSlug });
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
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItems breadcrumbs={breadcrumbs} workflow={workflow} isOnStepRoute={!!isOnStepRoute} />
          {isOnStepRoute && step && <StepBreadcrumb step={step} />}
        </BreadcrumbList>
      </Breadcrumb>
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

function WorkflowBreadcrumbContent({ workflow, label }: { workflow: WorkflowResponseDto; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <WorkflowIcon origin={workflow.origin} />
      <div className="flex max-w-[32ch]">
        <TruncatedText>{label}</TruncatedText>
      </div>
    </div>
  );
}

function StepBreadcrumb({ step }: { step: StepResponseDto }) {
  const Icon = getStepTypeIcon(step.type);

  return (
    <BreadcrumbItem>
      <BreadcrumbPage className="flex items-center gap-1">
        <Icon className="size-3.5" />
        <div className="flex max-w-[32ch]">
          <TruncatedText>{step.name || STEP_TYPE_LABELS[step.type]}</TruncatedText>
        </div>
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
                  {isWorkflowBreadcrumb ? <WorkflowBreadcrumbContent workflow={workflow} label={label} /> : label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink to={href}>
                  {isWorkflowBreadcrumb ? <WorkflowBreadcrumbContent workflow={workflow} label={label} /> : label}
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
