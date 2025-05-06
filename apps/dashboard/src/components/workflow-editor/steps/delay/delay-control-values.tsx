import { UiSchemaGroupEnum } from '@novu/shared';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import { Separator } from '@/components/primitives/separator';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';

const amountKey = 'amount';
const unitKey = 'unit';
const typeKey = 'type';

export const DelayControlValues = () => {
  const { workflow, step } = useWorkflow();
  const { uiSchema } = step?.controls ?? {};

  if (!uiSchema || !workflow || uiSchema?.group !== UiSchemaGroupEnum.DELAY) {
    return null;
  }

  const { [amountKey]: amount, [typeKey]: type, [unitKey]: unit } = uiSchema.properties ?? {};

  return (
    <>
      {amount && type && unit && (
        <>
          <SidebarContent>{getComponentByType({ component: amount.component })}</SidebarContent>
          <Separator />
        </>
      )}
    </>
  );
};
