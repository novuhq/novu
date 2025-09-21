import { useParams } from 'react-router-dom';
import { FullPageLayout } from '@/components/full-page-layout';
import { LayoutBreadcrumbs } from '@/components/layouts/layout-breadcrumbs';
import { LayoutEditor } from '@/components/layouts/layout-editor';
import { LayoutEditorProvider } from '@/components/layouts/layout-editor-provider';
import { PageMeta } from '@/components/page-meta';
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
        <FullPageLayout headerStartItems={<LayoutBreadcrumbs />}>
          <LayoutEditorSkeleton />
        </FullPageLayout>
      </>
    );
  }

  return (
    <>
      <PageMeta title={`Edit ${layout?.name} Layout`} />
      <FullPageLayout headerStartItems={<LayoutBreadcrumbs layout={layout} />}>
        <LayoutEditorProvider layout={layout} layoutSlug={layoutSlug} isPending={isPending}>
          <LayoutEditor />
        </LayoutEditorProvider>
      </FullPageLayout>
    </>
  );
};
