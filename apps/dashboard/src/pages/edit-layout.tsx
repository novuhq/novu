import { useParams } from 'react-router-dom';
import { LayoutBreadcrumbs } from '@/components/layouts/layout-breadcrumbs';
import { LayoutEditor } from '@/components/layouts/layout-editor';
import { LayoutEditorProvider } from '@/components/layouts/layout-editor-provider';
import { PageMeta } from '@/components/page-meta';
import { PageHeader } from '@/context/page-header';
import { useFetchLayout } from '@/hooks/use-fetch-layout';
import { LayoutEditorSkeleton } from '../components/layouts/layout-editor-skeleton';

export const EditLayoutPage = () => {
  const { layoutSlug = '' } = useParams<{
    layoutSlug?: string;
  }>();
  const { layout, isPending } = useFetchLayout({ layoutSlug });

  if (!layout) {
    return (
      <>
        <PageMeta title={`Edit Layout`} />
        <PageHeader>
          <LayoutBreadcrumbs />
        </PageHeader>
        <LayoutEditorSkeleton />
      </>
    );
  }

  return (
    <>
      <PageMeta title={`Edit ${layout?.name} Layout`} />
      <PageHeader>
        <LayoutBreadcrumbs layout={layout} />
      </PageHeader>
      <LayoutEditorProvider layout={layout} layoutSlug={layoutSlug} isPending={isPending}>
        <LayoutEditor />
      </LayoutEditorProvider>
    </>
  );
};
