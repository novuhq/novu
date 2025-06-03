import { WorkflowOriginEnum } from '@novu/shared';
import React from 'react';
import { FaCode } from 'react-icons/fa6';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

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
import TruncatedText from '@/components/truncated-text';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchWorkflow } from '@/hooks/use-fetch-workflow';
import { buildRoute, ROUTES } from '@/utils/routes';
import { RiArrowLeftSLine } from 'react-icons/ri';
import { CompactButton } from '../primitives/button-compact';
import { useWorkflow } from './workflow-provider';
import { STEP_TYPE_TO_ICON } from '@/components/icons/utils';
import { STEP_TYPE_LABELS } from '@/utils/constants';

export const EditorBreadcrumbs = () => {
  const { workflowSlug = '', stepSlug = '' } = useParams<{ workflowSlug: string; stepSlug?: string }>();
  const { currentEnvironment } = useEnvironment();
  const navigate = useNavigate();
  const location = useLocation();
  const workflowsRoute = buildRoute(ROUTES.WORKFLOWS, { environmentSlug: currentEnvironment?.slug ?? '' });
  const { workflow } = useFetchWorkflow({
    workflowSlug,
  });
  const { step } = useWorkflow();

  // Check if we're on a step editing route
  const isOnStepRoute =
    stepSlug &&
    step &&
    (location.pathname.includes('/edit') ||
      location.pathname.includes('/editor') ||
      location.pathname.includes('/conditions'));

  const breadcrumbs = [
    { label: currentEnvironment?.name, href: workflowsRoute },
    {
      label: 'Workflows',
      href: workflowsRoute,
    },
  ];

  // Add workflow breadcrumb
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

  const handleBackNav = () => {
    if (isOnStepRoute && workflow) {
      // If we're on a step route, go back to the workflow editor
      navigate(
        buildRoute(ROUTES.EDIT_WORKFLOW, {
          environmentSlug: currentEnvironment?.slug ?? '',
          workflowSlug: workflow.slug,
        })
      );
    } else {
      // Otherwise go back to workflows list
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
        onClick={handleBackNav}
      ></CompactButton>
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map(({ label, href }, index) => (
            <React.Fragment key={`${href}_${label}`}>
              <BreadcrumbItem className="flex items-center gap-1">
                {index === breadcrumbs.length - 1 && !isOnStepRoute ? (
                  // Last breadcrumb when not on step route - show as page
                  <BreadcrumbPage className="flex items-center gap-1">
                    {workflow?.origin === WorkflowOriginEnum.EXTERNAL ? (
                      <Badge color="yellow" size="sm" variant="lighter">
                        <FaCode className="size-3.5" />
                      </Badge>
                    ) : (
                      <RouteFill className="size-4" />
                    )}
                    <div className="flex max-w-[32ch]">
                      <TruncatedText>{label}</TruncatedText>
                    </div>
                  </BreadcrumbPage>
                ) : (
                  // Regular breadcrumb link
                  <BreadcrumbLink to={href}>
                    {index === breadcrumbs.length - 1 && workflow ? (
                      <div className="flex items-center gap-1">
                        {workflow.origin === WorkflowOriginEnum.EXTERNAL ? (
                          <Badge color="yellow" size="sm" variant="lighter">
                            <FaCode className="size-3.5" />
                          </Badge>
                        ) : (
                          <RouteFill className="size-4" />
                        )}
                        <div className="flex max-w-[32ch]">
                          <TruncatedText>{label}</TruncatedText>
                        </div>
                      </div>
                    ) : (
                      label
                    )}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {(index < breadcrumbs.length - 1 || isOnStepRoute) && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}

          {/* Step breadcrumb when on step route */}
          {isOnStepRoute && step && (
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-1">
                {(() => {
                  const Icon = STEP_TYPE_TO_ICON[step.type];
                  return <Icon className="size-3.5" />;
                })()}
                <div className="flex max-w-[32ch]">
                  <TruncatedText>{step.name || STEP_TYPE_LABELS[step.type]}</TruncatedText>
                </div>
              </BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};
