import { AnimatedOutlet } from '@/components/animated-outlet';
import { EditWorkflowLayout } from '@/components/edit-workflow-layout';
import { EditorBreadcrumbs } from '@/components/workflow-editor/editor-breadcrumbs';
import { WorkflowProvider } from '@/components/workflow-editor/workflow-provider';
import { WorkflowTabs } from '@/components/workflow-editor/workflow-tabs';

export const EditWorkflowPage = () => {
  return (
    <WorkflowProvider>
      <EditWorkflowLayout headerStartItems={<EditorBreadcrumbs />}>
        <div className="flex h-full flex-1 flex-nowrap">
          <WorkflowTabs />
          <aside className="text-foreground-950 [&_textarea]:text-neutral-600'; flex h-full w-[350px] max-w-[350px] flex-col border-l [&_input]:text-xs [&_input]:text-neutral-600 [&_label]:text-xs [&_label]:font-medium [&_textarea]:text-xs">
            <AnimatedOutlet />
          </aside>
        </div>
      </EditWorkflowLayout>
    </WorkflowProvider>
  );
};
