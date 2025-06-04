import { FeatureFlagsKeysEnum, UiSchemaGroupEnum, type UiSchema } from '@novu/shared';

import { Notification5Fill } from '@/components/icons';
import { Badge } from '@/components/primitives/badge';
import { Separator } from '@/components/primitives/separator';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { InAppTabsSection } from '@/components/workflow-editor/steps/in-app/in-app-tabs-section';
import { RiInstanceLine } from 'react-icons/ri';
import { useFeatureFlag } from '../../../../hooks/use-feature-flag';
import { cn } from '../../../../utils/ui';

const avatarKey = 'avatar';
const subjectKey = 'subject';
const bodyKey = 'body';
const redirectKey = 'redirect';
const primaryActionKey = 'primaryAction';
const secondaryActionKey = 'secondaryAction';
const disableOutputSanitizationKey = 'disableOutputSanitization';
const dataObjectKey = 'data';

export const InAppEditor = ({ uiSchema }: { uiSchema: UiSchema }) => {
  const isV2TemplateEditorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_TEMPLATE_EDITOR_ENABLED);

  if (uiSchema.group !== UiSchemaGroupEnum.IN_APP) {
    return null;
  }

  const {
    [avatarKey]: avatar,
    [subjectKey]: subject,
    [bodyKey]: body,
    [redirectKey]: redirect,
    [primaryActionKey]: primaryAction,
    [secondaryActionKey]: secondaryAction,
    [disableOutputSanitizationKey]: disableOutputSanitization,
    [dataObjectKey]: dataObject,
  } = uiSchema.properties ?? {};

  return (
    <div className="flex flex-col">
      <InAppTabsSection className={'flex flex-col gap-3 ' + (isV2TemplateEditorEnabled ? 'p-0 pb-3' : '')}>
        {!isV2TemplateEditorEnabled && (
          <div className={'flex items-center justify-between gap-2.5 text-sm font-medium'}>
            <div className="flex items-center gap-2.5">
              <Notification5Fill className="size-3" />
              <span>In-App template editor</span>
            </div>
            {disableOutputSanitization &&
              getComponentByType({
                component: disableOutputSanitization.component,
              })}
          </div>
        )}
        <div
          className={cn(
            'flex flex-col gap-2 rounded-xl border border-neutral-100 p-2',
            isV2TemplateEditorEnabled ? 'bg-bg-weak' : ''
          )}
        >
          {(avatar || subject) && (
            <div className="flex gap-2">
              {avatar && getComponentByType({ component: avatar.component })}
              {subject && getComponentByType({ component: subject.component })}
            </div>
          )}
          {body && getComponentByType({ component: body.component })}
          {(primaryAction || secondaryAction) &&
            getComponentByType({
              component: primaryAction.component || secondaryAction.component,
            })}
        </div>
      </InAppTabsSection>

      {redirect && (
        <InAppTabsSection className={cn('pt-0', isV2TemplateEditorEnabled ? 'p-0 pb-3' : '')}>
          {getComponentByType({
            component: redirect.component,
          })}
        </InAppTabsSection>
      )}

      {isV2TemplateEditorEnabled && (
        <div className={'ml-auto flex items-center justify-between gap-2.5 pb-3 text-sm font-medium'}>
          {disableOutputSanitization &&
            getComponentByType({
              component: disableOutputSanitization.component,
            })}
        </div>
      )}

      {dataObject && (
        <>
          <Separator />
          <InAppTabsSection className={cn('px-4 pb-0 pt-3', isV2TemplateEditorEnabled ? 'px-0 pb-0' : '')}>
            <div className="flex items-center gap-2.5 text-sm">
              <RiInstanceLine className="size-4" />
              <span>Developers</span>
            </div>
          </InAppTabsSection>
        </>
      )}

      {dataObject && (
        <>
          <InAppTabsSection className={cn('pb-0 pt-3', isV2TemplateEditorEnabled ? 'px-0 pb-3' : '')}>
            {getComponentByType({
              component: dataObject.component,
            })}
          </InAppTabsSection>
        </>
      )}
    </div>
  );
};
