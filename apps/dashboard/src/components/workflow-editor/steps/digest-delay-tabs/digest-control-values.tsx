import { FeatureFlagsKeysEnum, UiComponentEnum, UiSchemaGroupEnum } from '@novu/shared';
import { Separator } from '@/components/primitives/separator';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

const extendToScheduleKey = 'extendToSchedule';

export const DigestControlValues = () => {
  const isSubscribersScheduleEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_SUBSCRIBERS_SCHEDULE_ENABLED);
  const { step } = useWorkflow();
  const { uiSchema } = step?.controls ?? {};

  if (!uiSchema || uiSchema?.group !== UiSchemaGroupEnum.DIGEST) {
    return null;
  }

  const {
    ['amount']: amount,
    ['digestKey']: digestKey,
    ['unit']: unit,
    ['cron']: cron,
    [extendToScheduleKey]: extendToSchedule,
  } = uiSchema.properties ?? {};

  return (
    <div className="flex flex-col">
      {digestKey && (
        <>
          <SidebarContent size="lg">
            {getComponentByType({
              component: digestKey.component,
            })}
          </SidebarContent>
          <Separator />
        </>
      )}
      {((amount && unit) || cron) && (
        <>
          <SidebarContent size="lg">
            {getComponentByType({
              component: amount.component || unit.component || cron.component,
            })}
          </SidebarContent>
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
    </div>
  );
};
