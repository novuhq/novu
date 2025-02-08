import { Sms } from '@/components/icons';
import { type UiSchema } from '@novu/shared';

import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';

type SmsEditorProps = { uiSchema: UiSchema };

export const SmsEditor = (props: SmsEditorProps) => {
  const { uiSchema } = props;
  const { body } = uiSchema.properties ?? {};

  return (
    <div className="flex h-full flex-col">
      <TabsSection>
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <Sms className="size-3" />
          SMS template editor
        </div>
        <div className="rounded-12 flex flex-col gap-2 border border-neutral-100 p-2">
          {getComponentByType({ component: body.component })}
        </div>
      </TabsSection>
    </div>
  );
};
