import { SearchInput } from '@novu/design-system';
import { Button } from '@novu/novui';
import { IconOutlineAdd } from '@novu/novui/icons';
import { HStack } from '@novu/novui/jsx';
import { PageTemplate } from '../../../layout/index';
import { WorkflowsTable } from '../table/index';
import { useDiscover } from '../../../hooks/useBridgeAPI';
import { DocsButton } from '../../../../components/docs/DocsButton';
import { useSegment } from '../../../../components/providers/SegmentProvider';
import { useStudioNavigate } from '../../../hooks';
import { ROUTES } from '../../../../constants/routes';

export const WorkflowsListPage = () => {
  const { data, isLoading } = useDiscover();
  const segment = useSegment();
  const navigate = useStudioNavigate();

  if (data?.workflows) {
    navigate(ROUTES.STUDIO_FLOWS_VIEW, { templateId: data?.workflows[0].workflowId });
  }

  return (
    <PageTemplate title="Workflows">
      <HStack justify={'space-between'}>
        <DocsButton
          TriggerButton={({ onClick }) => (
            <Button
              onClick={() => {
                segment.track('Add new workflow clicked - [Workflows page]');
                onClick();
              }}
              Icon={IconOutlineAdd}
              variant="transparent"
              py="50"
            >
              Add workflow
            </Button>
          )}
        />
        <SearchInput placeholder="Type name or identifier..." />
      </HStack>
      <WorkflowsTable workflows={data?.workflows || []} isLoading={isLoading} />
    </PageTemplate>
  );
};
