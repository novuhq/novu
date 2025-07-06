import { FullPageLayout } from '@/components/full-page-layout';
import { LayoutBreadcrumbs } from '@/components/layouts/layout-breadcrumbs';
import { LayoutEditorProvider, useLayoutEditor } from '@/components/layouts/layout-editor-provider';
import { PageMeta } from '@/components/page-meta';
import { LayoutEditor } from '@/components/layouts/layout-editor';

export const EditLayoutPageInternal = () => {
  const { layout } = useLayoutEditor();

  return (
    <>
      <PageMeta title={`Edit ${layout?.name} Layout`} />
      <FullPageLayout headerStartItems={<LayoutBreadcrumbs />}>
        <LayoutEditor />
      </FullPageLayout>
    </>
  );
};

export const EditLayoutPage = () => {
  return (
    <LayoutEditorProvider>
      <EditLayoutPageInternal />
    </LayoutEditorProvider>
  );
};
