import { UiSchemaGroupEnum } from '@novu/shared';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { Separator } from '@/components/primitives/separator';
import { SidebarContent } from '@/components/side-navigation/sidebar';

export const DigestControlValues = () => {
  const { step } = useWorkflow();
  const { uiSchema } = step?.controls ?? {};

  if (!uiSchema || uiSchema?.group !== UiSchemaGroupEnum.DIGEST) {
    return null;
  }

  const { ['amount']: amount, ['digestKey']: digestKey, ['unit']: unit, ['cron']: cron } = uiSchema.properties ?? {};

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
          <Separator />
        </>
      )}
    </div>
  );
};
