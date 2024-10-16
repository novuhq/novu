import { EditWorkflowLayout } from '@/components/edit-workflow-layout';
import RouteFill from '@/components/icons/route-fill';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/primitives/breadcrumb';
import { WorkflowEditor } from '@/components/workflow-editor';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import React from 'react';
import { useLocation } from 'react-router-dom';

export const EditWorkflowPage = () => {
  return (
    <EditWorkflowLayout headerStartItems={<StartItems />}>
      <WorkflowEditor />
    </EditWorkflowLayout>
  );
};

const StartItems = () => {
  const { currentEnvironment } = useEnvironment();
  const { state } = useLocation();

  const breadcrumbs = [
    { label: currentEnvironment?.name, href: '/' },
    {
      label: 'Workflows',
      href: buildRoute(ROUTES.WORKFLOWS, { environmentId: currentEnvironment?._id ?? '' }),
    },
  ];

  return (
    <>
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
              {state?.workflowName}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
};
