import { Suspense } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import { FullPageLayout } from '@/components/full-page-layout';
import { LayoutEditorSkeleton } from '@/components/layouts/layout-editor-skeleton';
import { WorkflowEditorSkeleton } from '@/components/workflow-editor/workflow-editor-skeleton';
import { PersistentLayoutContext } from '@/context/page-header';
import { ROUTES } from '@/utils/routes';

export function EditorLayout() {
  const isLayoutEditor = useMatch(ROUTES.LAYOUTS_EDIT);

  return (
    <PersistentLayoutContext.Provider value={true}>
      <FullPageLayout>
        <Suspense fallback={isLayoutEditor ? <LayoutEditorSkeleton /> : <WorkflowEditorSkeleton />}>
          <Outlet />
        </Suspense>
      </FullPageLayout>
    </PersistentLayoutContext.Provider>
  );
}
