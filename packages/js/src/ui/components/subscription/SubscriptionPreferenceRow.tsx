import { createMemo } from 'solid-js';
import { SubscriptionPreference } from '../../../subscriptions/subscription-preference';
import { StringLocalizationKey, useLocalization } from '../../context/LocalizationContext';
import { useStyle } from '../../helpers';
import { SubscriptionAppearanceCallback } from '../../types';
import { Checkbox } from '../primitives/Checkbox';

export const SubscriptionPreferenceRow = (props: {
  preference: { label: string; preference: SubscriptionPreference };
}) => {
  const style = useStyle();
  const { t } = useLocalization();

  const preference = createMemo(() => props.preference.preference);

  const handleChange = async (checked: boolean) => {
    await preference().update({ value: checked });
  };

  const isChecked = () => {
    return preference().enabled;
  };

  return (
    <div
      class={style({
        key: 'subscriptionPreferenceRow',
        className: 'nt-flex nt-items-center nt-justify-between nt-p-2 nt-rounded-lg nt-gap-2',
        context: { preference: props.preference } satisfies Parameters<
          SubscriptionAppearanceCallback['subscriptionPreferenceRow']
        >[0],
      })}
    >
      <label
        for={`subscription-preference-${preference().workflow.identifier}`}
        class={style({
          key: 'subscriptionPreferenceLabel',
          className: 'nt-text-sm nt-font-medium nt-truncate nt-text-start nt-w-full nt-cursor-pointer',
          context: { preference: props.preference } satisfies Parameters<
            SubscriptionAppearanceCallback['subscriptionPreferenceLabel']
          >[0],
        })}
        data-localization={preference().workflow.identifier as StringLocalizationKey}
        title={props.preference.label ?? t(preference().workflow.identifier as StringLocalizationKey)}
      >
        {props.preference.label ?? t(preference().workflow.identifier as StringLocalizationKey)}
      </label>
      <Checkbox
        id={`subscription-preference-${preference().workflow.identifier}`}
        checked={isChecked()}
        onChange={handleChange}
      />
    </div>
  );
};
