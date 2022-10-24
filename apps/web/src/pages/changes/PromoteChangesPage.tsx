import { useState } from 'react';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Button, colors, Tabs } from '../../design-system';
import PageMeta from '../../components/layout/components/PageMeta';
import styled from '@emotion/styled';
import { usePromotedChanges, useUnPromotedChanges } from '../../api/hooks/use-environment-changes';
import { ChangesTable } from '../../components/changes/ChangesTableLayout';
import { useMutation, useQueryClient } from 'react-query';
import { bulkPromoteChanges } from '../../api/changes';
import { QueryKeys } from '../../api/query.keys';
import { successMessage } from '../../utils/notifications';

export function PromoteChangesPage() {
  const [page, setPage] = useState<number>(0);

  const { changes, isLoadingChanges, changesPageSize, totalChangesCount } = useUnPromotedChanges(page);
  const { history, isLoadingHistory, historyPageSize, totalHistoryCount } = usePromotedChanges(page);

  const queryClient = useQueryClient();
  const { mutate, isLoading } = useMutation(bulkPromoteChanges, {
    onSuccess: () => {
      queryClient.refetchQueries([QueryKeys.currentUnpromotedChanges]);
      queryClient.refetchQueries([QueryKeys.currentPromotedChanges]);
      queryClient.refetchQueries([QueryKeys.changesCount]);
      successMessage('All changes were promoted');
    },
  });

  function handleTableChange(pageIndex) {
    setPage(pageIndex);
  }

  const menuTabs = [
    {
      label: 'Pending',
      content: (
        <ChangesTable
          loading={isLoadingChanges}
          changes={changes}
          handleTableChange={handleTableChange}
          page={page}
          pageSize={changesPageSize}
          totalCount={totalChangesCount}
        />
      ),
    },
    {
      label: 'History',
      content: (
        <ChangesTable
          loading={isLoadingHistory}
          changes={history}
          handleTableChange={handleTableChange}
          page={page}
          pageSize={historyPageSize}
          totalCount={totalHistoryCount}
        />
      ),
    },
  ];

  return (
    <PageContainer>
      <PageMeta title="Changes" />
      <PageHeader
        title="Changes"
        actions={
          <Button
            disabled={isLoadingChanges || changes.length === 0}
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
