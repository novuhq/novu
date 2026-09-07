import { UiSchemaGroupEnum } from '@novu/shared';
import { Separator } from '@/components/primitives/separator';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';

const typeKey = 'type';
const amountKey = 'amount';
const unitKey = 'unit';
const dynamicKeyKey = 'dynamicKey';
const thresholdKey = 'threshold';
const throttleKeyKey = 'throttleKey';

export const ThrottleControlValues = () => {
  const { workflow, step } = useWorkflow();
  const { uiSchema } = step?.controls ?? {};

  if (!uiSchema || !workflow || uiSchema?.group !== UiSchemaGroupEnum.THROTTLE) {
    return null;
  }

  const {
    [typeKey]: type,
    [amountKey]: amount,
    [unitKey]: unit,
    [dynamicKeyKey]: dynamicKey,
    [thresholdKey]: threshold,
    [throttleKeyKey]: throttleKey,
  } = uiSchema.properties ?? {};

  return (
    <>
      {(type || amount || unit || dynamicKey) && (
        <>
          <SidebarContent>
            {getComponentByType({
              component: type?.component || amount?.component || unit?.component || dynamicKey?.component,
            })}
          </SidebarContent>
          <Separator />
        </>
      )}
      {threshold && (
        <>
          <SidebarContent>{getComponentByType({ component: threshold.component })}</SidebarContent>
          <Separator />
        </>
      )}
      {throttleKey && (
        <>
          <SidebarContent>{getComponentByType({ component: throttleKey.component })}</SidebarContent>
          <Separator />
        </>
      )}
    </>
  );
};
