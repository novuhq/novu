import { type UiSchema } from '@novu/shared';

import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';

type PushEditorProps = { uiSchema: UiSchema };

export const PushEditor = (props: PushEditorProps) => {
  const { uiSchema } = props;
  const { body, subject } = uiSchema?.properties ?? {};

  return (
    <div className="flex h-full flex-col">
      <TabsSection>
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <span>Push template editor</span>
        </div>
        <div className="rounded-12 flex flex-col gap-2 border border-neutral-100 p-2">
          {getComponentByType({ component: subject.component })}
          {getComponentByType({ component: body.component })}
        </div>
      </TabsSection>
    </div>
  );
};
