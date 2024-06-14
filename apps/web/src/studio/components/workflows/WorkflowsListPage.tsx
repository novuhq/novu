import { Button } from '@novu/novui';
import { SearchInput } from '@novu/design-system';
import { IconAddBox } from '@novu/novui/icons';
import { Flex } from '@novu/novui/jsx';
import { css } from '@novu/novui/css';
import { PageTemplate } from '../../layout';
import { WorkflowsTable } from './table';

export const WorkflowsListPage = () => {
  return (
    <PageTemplate title="Workflows" className={css({ colorPalette: 'mode.cloud' })}>
      <Flex justify={'space-between'}>
        <Button onClick={() => alert('Add workflow!')} Icon={IconAddBox} size={'sm'} variant="transparent">
          Add workflow
        </Button>
        <SearchInput placeholder="Type name or identifier..." />
      </Flex>
      <WorkflowsTable />
    </PageTemplate>
  );
};
