import { FeatureFlagsKeysEnum, UiComponentEnum, UiSchemaGroupEnum } from '@novu/shared';
import { Separator } from '@/components/primitives/separator';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

const amountKey = 'amount';
const unitKey = 'unit';
const typeKey = 'type';
const extendToScheduleKey = 'extendToSchedule';

export const DelayControlValues = () => {
  const isSubscribersScheduleEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_SUBSCRIBERS_SCHEDULE_ENABLED);
  const { workflow, step } = useWorkflow();
  const { uiSchema } = step?.controls ?? {};

  if (!uiSchema || !workflow || uiSchema?.group !== UiSchemaGroupEnum.DELAY) {
    return null;
  }

  const {
    [amountKey]: amount,
    [typeKey]: type,
    [unitKey]: unit,
    [extendToScheduleKey]: extendToSchedule,
  } = uiSchema.properties ?? {};

  return (
    <>
      {amount && type && unit && (
        <>
          <SidebarContent>{getComponentByType({ component: amount.component })}</SidebarContent>
          {isSubscribersScheduleEnabled && (
            <>
              <Separator />
              <SidebarContent>
                {getComponentByType({ component: extendToSchedule?.component ?? UiComponentEnum.EXTEND_TO_SCHEDULE })}
              </SidebarContent>
            </>
          )}
          <Separator />
        </>
      )}
    </>
  );
};
