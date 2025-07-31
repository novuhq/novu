import { FeatureFlagsKeysEnum, PermissionsEnum } from '@novu/shared';
import { useState } from 'react';
import { RiCodeSSlashLine, RiPlayCircleLine } from 'react-icons/ri';
import { Link, useMatch, useNavigate } from 'react-router-dom';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { Protect } from '@/utils/protect';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Button } from '../primitives/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../primitives/tabs';
import { TestWorkflowInstructions } from './test-workflow/test-workflow-instructions';
import { WorkflowActivity } from './workflow-activity';
import { WorkflowCanvas } from './workflow-canvas';

export const WorkflowTabs = () => {
  const { workflow } = useWorkflow();
  const { currentEnvironment } = useEnvironment();
  const navigate = useNavigate();
  const activityMatch = useMatch(ROUTES.EDIT_WORKFLOW_ACTIVITY);
  const isV2TemplateEditorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_TEMPLATE_EDITOR_ENABLED);
  const [isIntegrateDrawerOpen, setIsIntegrateDrawerOpen] = useState(false);

  const handleIntegrateWorkflowClick = () => {
    setIsIntegrateDrawerOpen(true);
  };

  // Determine current tab based on URL
  const currentTab = activityMatch ? 'activity' : 'workflow';

  return (
    <div className="flex h-full flex-1 flex-nowrap">
      <Tabs defaultValue="workflow" className="-mt-px flex h-full flex-1 flex-col" value={currentTab}>
        <TabsList variant="regular" className="items-center">
          <TabsTrigger value="workflow" asChild variant="regular" size="lg">
            <Link
              to={buildRoute(ROUTES.EDIT_WORKFLOW, {
                environmentSlug: currentEnvironment?.slug ?? '',
                workflowSlug: workflow?.slug ?? '',
              })}
            >
              Workflow
            </Link>
          </TabsTrigger>
          {isV2TemplateEditorEnabled && (
            <TabsTrigger value="activity" asChild variant="regular" size="lg">
              <Link
                to={buildRoute(ROUTES.EDIT_WORKFLOW_ACTIVITY, {
                  environmentSlug: currentEnvironment?.slug ?? '',
                  workflowSlug: workflow?.slug ?? '',
                })}
              >
                Activity
              </Link>
            </TabsTrigger>
          )}
          {!isV2TemplateEditorEnabled && (
            <Protect permission={PermissionsEnum.EVENT_WRITE}>
              <TabsTrigger value="trigger" asChild variant="regular" size="lg">
                <Link
                  to={buildRoute(ROUTES.TEST_WORKFLOW, {
                    environmentSlug: currentEnvironment?.slug ?? '',
                    workflowSlug: workflow?.slug ?? '',
                  })}
                >
                  Trigger
                </Link>
              </TabsTrigger>
            </Protect>
          )}
          {isV2TemplateEditorEnabled && (
            <div className="my-auto ml-auto flex items-center gap-2">
              <Protect permission={PermissionsEnum.EVENT_WRITE}>
                <Button
                  variant="secondary"
                  size="2xs"
                  mode="ghost"
                  leadingIcon={RiCodeSSlashLine}
                  onClick={handleIntegrateWorkflowClick}
                >
                  Integrate workflow
                </Button>
                <Button
                  variant="secondary"
                  size="2xs"
                  mode="gradient"
                  leadingIcon={RiPlayCircleLine}
                  onClick={() => {
                    navigate(
                      buildRoute(ROUTES.TRIGGER_WORKFLOW, {
                        environmentSlug: currentEnvironment?.slug ?? '',
                        workflowSlug: workflow?.slug ?? '',
                      })
                    );
                  }}
                >
                  Test workflow
                </Button>
              </Protect>
            </div>
          )}
        </TabsList>
        <TabsContent value="workflow" className="mt-0 h-full w-full">
          <WorkflowCanvas steps={workflow?.steps || []} />
        </TabsContent>
        {isV2TemplateEditorEnabled && (
          <TabsContent value="activity" className="mt-0 h-full w-full">
            <WorkflowActivity />
          </TabsContent>
        )}
      </Tabs>

      {isV2TemplateEditorEnabled && (
        <TestWorkflowInstructions
          isOpen={isIntegrateDrawerOpen}
          onClose={() => setIsIntegrateDrawerOpen(false)}
          workflow={workflow}
          to={{}}
          payload="{}"
        />
      )}
    </div>
  );
};
