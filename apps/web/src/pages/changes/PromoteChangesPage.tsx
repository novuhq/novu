import React from 'react';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Button, Tabs } from '../../design-system';
import PageMeta from '../../components/layout/components/PageMeta';
import styled from '@emotion/styled';
import { useEnvironmentChanges } from '../../api/hooks/use-environment-changes';
import { ChangesTable } from '../../components/changes/ChangesTableLayout';

export function PromoteChangesPage() {
  const { changes, isLoadingChanges, refetchChanges, history, isLoadingHistory, refetchHistory } =
    useEnvironmentChanges();

  const menuTabs = [
    {
      label: 'Pending',
      content: <ChangesTable loading={isLoadingChanges} changes={changes?.data} />,
    },
    {
      label: 'History',
      content: <ChangesTable loading={isLoadingHistory} changes={history?.data} />,
    },
  ];

  return (
    <PageContainer>
      <PageMeta title="Changes" />
      <PageHeader title="Changes" actions={<Button>Promote All</Button>} />
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
