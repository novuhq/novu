import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import styled from '@emotion/styled';

import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Button, Tabs } from '@novu/design-system';
import { useEnvController, usePromotedChanges, useUnPromotedChanges } from '../../hooks';
import { ChangesTable } from './components/ChangesTableLayout';
import { bulkPromoteChanges } from '../../api/changes';
import { QueryKeys } from '../../api/query.keys';
import { errorMessage, successMessage } from '../../utils/notifications';
import { ROUTES } from '../../constants/routes.enum';

const PENDING = 'Pending';
const HISTORY = 'History';

export function PromoteChangesPage() {
  const [page, setPage] = useState<number>(0);
  const navigate = useNavigate();
  const { readonly } = useEnvController();

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
    onError: (err: any) => {
      errorMessage(err?.message || 'Something went wrong! Failed to promote changes');
    },
  });

  function handleTableChange(pageIndex) {
    setPage(pageIndex);
  }

  if (readonly) {
    navigate(ROUTES.HOME);
  }

  const menuTabs = [
    {
      value: PENDING,
      content: (
        <ChangesTable
          key={page}
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
          key={page}
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
    <PageContainer title="Changes">
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
        <Tabs menuTabs={menuTabs} defaultValue={PENDING} onTabChange={() => setPage(0)} />
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
