import { UiComponentEnum, UiSchemaGroupEnum } from '@novu/shared';
import { Separator } from '@/components/primitives/separator';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';

const typeKey = 'type';
const amountKey = 'amount';
const unitKey = 'unit';
const cronKey = 'cron';
const dynamicKeyKey = 'dynamicKey';
const extendToScheduleKey = 'extendToSchedule';

export const DelayControlValues = () => {
  const { workflow, step } = useWorkflow();
  const { uiSchema } = step?.controls ?? {};

  if (!uiSchema || !workflow || uiSchema?.group !== UiSchemaGroupEnum.DELAY) {
    return null;
  }

  const {
    [typeKey]: type,
    [amountKey]: amount,
    [unitKey]: unit,
    [cronKey]: cron,
    [dynamicKeyKey]: dynamicKey,
    [extendToScheduleKey]: extendToSchedule,
  } = uiSchema.properties ?? {};

  return (
    <>
      {(type || amount || unit || cron || dynamicKey) && (
        <>
          <SidebarContent size="lg">
            {getComponentByType({
              component:
                type?.component || amount?.component || unit?.component || cron?.component || dynamicKey?.component,
            })}
          </SidebarContent>
          <Separator />
          <SidebarContent>
            {getComponentByType({ component: extendToSchedule?.component ?? UiComponentEnum.EXTEND_TO_SCHEDULE })}
          </SidebarContent>
          <Separator />
        </>
      )}
    </>
  );
};
