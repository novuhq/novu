import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { RiPlayCircleLine } from 'react-icons/ri';
import { useForm } from 'react-hook-form';
// eslint-disable-next-line
// @ts-ignore
import { zodResolver } from '@hookform/resolvers/zod';
import type { WorkflowTestDataResponseDto } from '@novu/shared';
// import { TestWorkflowLogsSidebar } from './test-workflow-logs-sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../primitives/tabs';
import { buildRoute, LEGACY_ROUTES, ROUTES } from '@/utils/routes';
import { useFetchWorkflow } from '@/hooks';
import { Form } from '../../primitives/form/form';
import { Button } from '../../primitives/button';
import { useTriggerWorkflow } from '@/hooks/use-trigger-workflow';
import { showToast } from '../../primitives/sonner-helpers';
import { ToastClose, ToastIcon } from '../../primitives/sonner';
import { buildDynamicFormSchema, makeObjectFromSchema, TestWorkflowFormType } from '../schema';
import { TestWorkflowForm } from './test-workflow-form';

export const TestWorkflowTabs = ({ testData }: { testData: WorkflowTestDataResponseDto }) => {
  const { environmentId = '', workflowId = '' } = useParams<{ environmentId: string; workflowId: string }>();
  const { workflow } = useFetchWorkflow({
    workflowId,
  });
  const to = useMemo(
    () => (typeof testData.to === 'object' ? makeObjectFromSchema({ properties: testData.to.properties ?? {} }) : {}),
    [testData]
  );
  const payload = useMemo(
    () =>
      typeof testData.payload === 'object'
        ? makeObjectFromSchema({ properties: testData.payload.properties ?? {} })
        : {},
    [testData]
  );
  const form = useForm<TestWorkflowFormType>({
    mode: 'onSubmit',
    resolver: zodResolver(buildDynamicFormSchema({ to: testData?.to ?? {} })),
    defaultValues: { to, payload: JSON.stringify(payload, null, 2) },
  });
  const { handleSubmit } = form;
  const { triggerWorkflow } = useTriggerWorkflow();

  const onSubmit = async (data: TestWorkflowFormType) => {
    try {
      const {
        data: { transactionId },
      } = await triggerWorkflow({ name: workflow?.workflowId ?? '', to: data.to, payload: data.payload });
      showToast({
        variant: 'lg',
        children: ({ close }) => (
          <>
            <ToastIcon variant="success" />
            <div className="flex flex-col gap-2">
              <span className="font-medium">Test workflow triggered successfully</span>
              <span className="text-foreground-600">{`Test workflow ${workflowId} was triggered successfully`}</span>
              <Link
                to={`${LEGACY_ROUTES.ACTIVITY_FEED}?transactionId=${transactionId}`}
                reloadDocument
                className="text-foreground-950 flex items-center gap-1 text-sm font-medium"
              >
                View activity feed
              </Link>
            </div>
            <ToastClose onClick={close} />
          </>
        ),
        options: {
          position: 'bottom-right',
        },
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-full w-full">
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="roun flex h-full flex-1 flex-nowrap">
          <Tabs defaultValue="workflow" className="-mt-[1px] flex h-full flex-1 flex-col" value="trigger">
            <TabsList>
              <TabsTrigger value="workflow" asChild>
                <Link
                  to={buildRoute(ROUTES.EDIT_WORKFLOW, {
                    environmentId,
                    workflowId,
                  })}
                >
                  Workflow
                </Link>
              </TabsTrigger>
              <TabsTrigger value="trigger" asChild>
                <Link
                  to={buildRoute(ROUTES.TEST_WORKFLOW, {
                    environmentId,
                    workflowId,
                  })}
                >
                  Trigger
                </Link>
              </TabsTrigger>
              <div className="ml-auto">
                <Button type="submit" variant="primary" size="sm" className="flex gap-1">
                  <RiPlayCircleLine className="size-5" />
                  <span>Test workflow</span>
                </Button>
              </div>
            </TabsList>
            <TabsContent value="trigger" className="mt-0 h-full w-full">
              <TestWorkflowForm workflow={workflow} />
            </TabsContent>
          </Tabs>
          {/* <TestWorkflowLogsSidebar /> */}
        </form>
      </Form>
    </div>
  );
};
