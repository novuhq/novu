import { SearchInput } from '@novu/design-system';
import { Button } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconAddBox } from '@novu/novui/icons';
import { Flex } from '@novu/novui/jsx';
import { PageContainer } from '../../layout/PageContainer';
import { PageMeta } from '../../layout/PageMeta';

export const WorkflowsDetailPage = () => {
  const title = 'Example';

  return (
    <PageContainer className={css({ colorPalette: 'mode.cloud' })}>
      <PageMeta title={title} />
      <Flex justify={'space-between'}>
        <Button onClick={() => alert('Add workflow!')} Icon={IconAddBox} variant="transparent" size={'sm'}>
          Add workflow
        </Button>
        <SearchInput placeholder="Type name or identifier..." />
      </Flex>
    </PageContainer>
  );
};
