import { ControlInput } from '@/components/workflow-editor/control-input';
import type { ChatCardDoc } from './card-types';

export function CardHeaderEditor({
  doc,
  variables,
  isAllowedVariable,
  onUpdate,
}: {
  doc: ChatCardDoc;
  variables: React.ComponentProps<typeof ControlInput>['variables'];
  isAllowedVariable: React.ComponentProps<typeof ControlInput>['isAllowedVariable'];
  onUpdate: (patch: Partial<ChatCardDoc>) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-neutral-100 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-foreground-400">Card header</div>
      <ControlInput
        className="text-base font-semibold"
        variables={variables}
        isAllowedVariable={isAllowedVariable}
        value={doc.title ?? ''}
        onChange={(title) => onUpdate({ title })}
        placeholder="Title (optional)"
        enableTranslations
      />
      <ControlInput
        variables={variables}
        isAllowedVariable={isAllowedVariable}
        value={doc.subtitle ?? ''}
        onChange={(subtitle) => onUpdate({ subtitle })}
        placeholder="Subtitle (optional)"
        enableTranslations
      />
    </div>
  );
}
