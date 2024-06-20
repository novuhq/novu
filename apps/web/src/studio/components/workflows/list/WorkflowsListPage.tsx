import { SearchInput } from '@novu/design-system';
import { Button } from '@novu/novui';
import { IconAddBox } from '@novu/novui/icons';
import { Flex } from '@novu/novui/jsx';
import { PageTemplate } from '../../../layout/index';
import { WorkflowsTable } from '../table/index';
import { useQuery } from '@tanstack/react-query';
import { bridgeApi } from '../../../../api/bridge/bridge.api';
import { useState } from 'react';
import { DocsModal } from '../../../../components/docs/DocsModal';

export const WorkflowsListPage = () => {
  const [docsOpen, setDocsOpen] = useState<boolean>(false);
  const { data, isLoading } = useQuery(['bridge-workflows'], async () => {
    return bridgeApi.discover();
  });

  const toggleDocs = () => {
    setDocsOpen((prevOpen) => !prevOpen);
  };

  return (
    <PageTemplate title="Workflows">
      <Flex justify={'space-between'}>
        <Button onClick={toggleDocs} Icon={IconAddBox} size={'sm'} variant="transparent">
          Add workflow
        </Button>
        <SearchInput placeholder="Type name or identifier..." />
      </Flex>
      <WorkflowsTable workflows={data?.workflows || []} isLoading={isLoading} />
      <DocsModal open={docsOpen} toggle={toggleDocs} path="echo/concepts/workflows" />
    </PageTemplate>
  );
};
