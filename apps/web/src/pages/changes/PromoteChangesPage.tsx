import { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import styled from '@emotion/styled';

import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Button, Tabs } from '../../design-system';
import PageMeta from '../../components/layout/components/PageMeta';
import { usePromotedChanges, useUnPromotedChanges } from '../../api/hooks/use-environment-changes';
import { ChangesTable } from '../../components/changes/ChangesTableLayout';
import { bulkPromoteChanges } from '../../api/changes';
import { QueryKeys } from '../../api/query.keys';
import { successMessage } from '../../utils/notifications';

const PENDING = 'Pending';
const HISTORY = 'History';

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
      value: PENDING,
      content: (
        <ChangesTable
          loading={isLoadingChanges}
          changes={changes}
          handleTableChange={handleTableChange}
          page={page}
          pageSize={changesPageSize}
          totalCount={totalChangesCount}
          dataTestId="pending-changes-table"
        />
      ),
    },
    {
      value: HISTORY,
      content: (
        <ChangesTable
          loading={isLoadingHistory}
          changes={history}
          handleTableChange={handleTableChange}
          page={page}
          pageSize={historyPageSize}
          totalCount={totalHistoryCount}
          dataTestId="history-changes-table"
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
        <Tabs menuTabs={menuTabs} defaultValue={PENDING} />
      </StyledTabs>
    </PageContainer>
  );
}

const StyledTabs = styled.div`
  .mantine-Tabs-tabsList {
    margin-left: 30px;
    margin-top: 15px;
  }
`;
