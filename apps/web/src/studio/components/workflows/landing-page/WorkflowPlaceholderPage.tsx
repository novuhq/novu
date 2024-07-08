import { CorePropsWithChildren, LocalizedMessage, Text } from '@novu/novui';
import { IconOutlineMenuBook } from '@novu/novui/icons';
import { VStack } from '@novu/novui/jsx';
import { DocsButton } from '../../../../components/docs/DocsButton';
import { hstack } from '@novu/novui/patterns';
import { PageContainer } from '../../../layout/PageContainer';
import { IPageMetaProps, PageMeta } from '../../../layout/PageMeta';
import { css } from '@novu/novui/css';

export type WorkflowPlaceholderPageContentProps = { docsButtonLabel: LocalizedMessage } & CorePropsWithChildren;

export function WorkflowPlaceholderPageContent({ children, docsButtonLabel }: WorkflowPlaceholderPageContentProps) {
  return (
    <VStack gap="margins.layout.text.paragraph">
      <Text color={'typography.text.secondary'} textAlign={'center'}>
        {children}
      </Text>
      <DocsButton
        TriggerButton={({ onClick }) => (
          <button
            onClick={onClick}
            className={hstack({ gap: 'margins.icons.Icon20-txt', cursor: 'pointer', _hover: { opacity: 'hover' } })}
          >
            <IconOutlineMenuBook />
            <Text color={'typography.text.secondary'}>{docsButtonLabel}</Text>
          </button>
        )}
      />
    </VStack>
  );
}

type WorkflowPlaceholderPageProps = WorkflowPlaceholderPageContentProps & Required<IPageMetaProps>;

export function WorkflowPlaceholderPage({ children, title, ...contentProps }: WorkflowPlaceholderPageProps) {
  return (
    <PageContainer className={css({ alignContent: 'center' })}>
      <>
        <PageMeta title={title} />
        <WorkflowPlaceholderPageContent {...contentProps}>{children}</WorkflowPlaceholderPageContent>
      </>
    </PageContainer>
  );
}
