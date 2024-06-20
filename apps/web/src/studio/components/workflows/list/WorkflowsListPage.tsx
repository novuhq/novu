import { SearchInput } from '@novu/design-system';
import { Button } from '@novu/novui';
import { IconAddBox } from '@novu/novui/icons';
import { Flex } from '@novu/novui/jsx';
import { PageTemplate } from '../../../layout/index';
import { WorkflowsTable } from '../table/index';
import { useQuery } from '@tanstack/react-query';
import { bridgeApi } from '../../../../api/bridge/bridge.api';
import { useEffect } from 'react';
import { useDocsModal } from '../../../../components/docs/useDocsModal';

export const WorkflowsListPage = () => {
  const { data, isLoading } = useQuery(['bridge-workflows'], async () => {
    return bridgeApi.discover();
  });

  const { Component: DocsModal, setPath, toggle } = useDocsModal();

  useEffect(() => {
    setPath('echo/concepts/workflows');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageTemplate title="Workflows">
      <Flex justify={'space-between'}>
        <Button onClick={toggle} Icon={IconAddBox} size={'sm'} variant="transparent">
          Add workflow
        </Button>
        <SearchInput placeholder="Type name or identifier..." />
      </Flex>
      <WorkflowsTable workflows={data?.workflows || []} isLoading={isLoading} />
      <DocsModal />
    </PageTemplate>
  );
};
