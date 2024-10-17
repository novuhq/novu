import { EditWorkflowLayout } from '@/components/edit-workflow-layout';
import { ArrowRight, RouteFill } from '@/components/icons';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/primitives/breadcrumb';
import { Button } from '@/components/primitives/button';
import { WorkflowEditor } from '@/components/workflow-editor';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchWorkflow } from '@/hooks/use-fetch-workflow';
import { buildRoute, ROUTES } from '@/utils/routes';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export const EditWorkflowPage = () => {
  return (
    <EditWorkflowLayout headerStartItems={<StartItems />}>
      <WorkflowEditor />
    </EditWorkflowLayout>
  );
};

const StartItems = () => {
  const { currentEnvironment } = useEnvironment();
  const { workflowId } = useParams<{ workflowId?: string }>();
  const navigate = useNavigate();
  const workflowsRoute = buildRoute(ROUTES.WORKFLOWS, { environmentId: currentEnvironment?._id ?? '' });
  const { workflow } = useFetchWorkflow({
    workflowId,
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
    <div className="flex items-center gap-2">
      <Button variant="link" onClick={handleBackNav}>
        <ArrowRight className="text-neutral-950" />
      </Button>
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map(({ label, href }) => (
            <React.Fragment key={href}>
              <BreadcrumbItem>
                <BreadcrumbLink to={href}>{label}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </React.Fragment>
          ))}
          <BreadcrumbItem>
            <BreadcrumbPage>
              <RouteFill />
              {workflow?.name}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};
