import { WorkflowOriginEnum } from '@novu/shared';
import React from 'react';
import { FaCode } from 'react-icons/fa6';
import { useNavigate, useParams } from 'react-router-dom';

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

export const EditorBreadcrumbs = () => {
  const { workflowSlug = '' } = useParams<{ workflowSlug: string }>();
  const { currentEnvironment } = useEnvironment();
  const navigate = useNavigate();
  const workflowsRoute = buildRoute(ROUTES.WORKFLOWS, { environmentSlug: currentEnvironment?.slug ?? '' });
  const { workflow } = useFetchWorkflow({
    workflowSlug,
  });

  const breadcrumbs = [
    { label: currentEnvironment?.name, href: workflowsRoute },
    {
      label: 'Workflows',
      href: workflowsRoute,
    },
  ];

  const handleBackNav = () => {
    navigate(workflowsRoute);
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
          {breadcrumbs.map(({ label, href }) => (
            <React.Fragment key={`${href}_${label}`}>
              <BreadcrumbItem className="flex items-center gap-1">
                <BreadcrumbLink to={href}>{label}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </React.Fragment>
          ))}
          <BreadcrumbItem>
            {workflow && (
              <BreadcrumbPage className="flex items-center gap-1">
                {workflow.origin === WorkflowOriginEnum.EXTERNAL ? (
                  <Badge color="yellow" size="sm" variant="lighter">
                    <FaCode className="size-3.5" />
                  </Badge>
                ) : (
                  <RouteFill className="size-4" />
                )}
                <div className="flex max-w-[32ch]">
                  <TruncatedText>{workflow?.name}</TruncatedText>
                </div>
              </BreadcrumbPage>
            )}
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};
