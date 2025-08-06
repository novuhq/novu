import { useLayoutEditor } from './layout-editor-provider';
import { LayoutEmailEditor } from './layout-email-editor';

function NoEditorAvailable({ message }: { message: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-neutral-500">{message}</div>;
}

export function LayoutEditorFactory() {
  const { layout, isLayoutEditable } = useLayoutEditor();
  const { uiSchema } = layout?.controls || {};

  if (!isLayoutEditable || !uiSchema) {
    return (
      <NoEditorAvailable
        message={
          !isLayoutEditable ? 'No editor available for this step configuration' : 'No editor configuration available'
        }
      />
    );
  }

  return (
    <div className="border-soft-200 h-full overflow-hidden rounded-lg border shadow-lg">
      <LayoutEmailEditor uiSchema={uiSchema} />
    </div>
  );
}
