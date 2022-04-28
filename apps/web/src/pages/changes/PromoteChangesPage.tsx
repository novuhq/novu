import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Button, Tabs } from '../../design-system';
import PageMeta from '../../components/layout/components/PageMeta';
import styled from '@emotion/styled';
import { useEnvironmentChanges } from '../../api/hooks/use-environment-changes';
import { ChangesTable } from '../../components/changes/ChangesTableLayout';
import { useMutation, useQueryClient } from 'react-query';
import { bulkPromoteChanges } from '../../api/changes';
import { QueryKeys } from '../../api/query.keys';
import { showNotification } from '@mantine/notifications';

export function PromoteChangesPage() {
  const { changes = [], isLoadingChanges, history, isLoadingHistory } = useEnvironmentChanges();
  const queryClient = useQueryClient();
  const { mutate, isLoading } = useMutation(bulkPromoteChanges, {
    onSuccess: () => {
      queryClient.refetchQueries([QueryKeys.currentUnpromotedChanges]);
      queryClient.refetchQueries([QueryKeys.currentPromotedChanges]);
      queryClient.refetchQueries([QueryKeys.changesCount]);
      showNotification({
        message: 'All changes was promoted',
        color: 'green',
      });
    },
  });

  const menuTabs = [
    {
      label: 'Pending',
      content: <ChangesTable loading={isLoadingChanges} changes={changes} />,
    },
    {
      label: 'History',
      content: <ChangesTable loading={isLoadingHistory} changes={history} />,
    },
  ];

  return (
    <PageContainer>
      <PageMeta title="Changes" />
      <PageHeader
        title="Changes"
        actions={
          <Button
            disabled={changes.length === 0}
            data-test-id="promote-all-btn"
            loading={isLoading}
            onClick={() => {
              mutate(changes.map((change) => change._id));
            }}
          >
            Promote All
          </Button>
        }
      />
      <StyledTabs>
        <Tabs menuTabs={menuTabs} />
      </StyledTabs>
    </PageContainer>
  );
}

const StyledTabs = styled.div`
  .mantine-Tabs-tabsListWrapper {
    margin-left: 30px;
    margin-top: 15px;
  }
`;
