import { createMemo, JSXElement } from 'solid-js';
import { JSX as SolidJSX } from 'solid-js/jsx-runtime';
import { TopicSubscription } from '../../../subscriptions';
import { useLocalization } from '../../context/LocalizationContext';
import { useStyle } from '../../helpers/useStyle';
import { BellCross } from '../../icons/BellCross';
import { BellPlus } from '../../icons/BellPlus';
import { Loader } from '../../icons/Loader';
import { AllIconKey, SubscriptionAppearanceCallback } from '../../types';
import { Button, Motion } from '../primitives';
import { IconRendererWrapper } from '../shared/IconRendererWrapper';

type IconComponentType = (props?: SolidJSX.HTMLAttributes<SVGSVGElement>) => JSXElement;

const iconKeyToComponentMap: { [key in AllIconKey]?: IconComponentType } = {
  bellCross: BellCross,
  bellPlus: BellPlus,
};

type SubscriptionButtonProps = {
  subscription?: TopicSubscription | null;
  loading?: boolean;
  onClick: () => void;
};

export const SubscriptionButton = (props: SubscriptionButtonProps) => {
  const style = useStyle();
  const { t } = useLocalization();

  const subscription = createMemo(() => props.subscription ?? undefined);
  const iconKey = createMemo(() => (props.subscription ? 'bellCross' : 'bellPlus'));
  const IconComponent = createMemo(() => iconKeyToComponentMap[iconKey()]);

  return (
    <Button
      class={style({
        key: 'subscriptionButton__button',
        className: 'nt-transition-[width] nt-duration-800 nt-will-change-[width]',
        context: { subscription: subscription() } satisfies Parameters<
          SubscriptionAppearanceCallback['subscriptionButton__button']
        >[0],
      })}
      variant="secondary"
      onClick={props.onClick}
      disabled={props.loading}
    >
      <span
        class={style({
          key: 'subscriptionButtonContainer',
          className: 'nt-relative nt-overflow-hidden nt-inline-flex nt-items-center nt-justify-center nt-gap-1',
          context: { subscription: subscription() } satisfies Parameters<
            SubscriptionAppearanceCallback['subscriptionButtonContainer']
          >[0],
        })}
      >
        <Motion.span
          initial={{ opacity: 1 }}
          animate={{ opacity: props.loading ? 0 : 1 }}
          transition={{ easing: 'ease-in-out', duration: 0.2 }}
          class="nt-inline-flex nt-items-center"
        >
          <IconRendererWrapper
            iconKey={iconKey()}
            class={style({
              key: 'subscriptionButtonIcon',
              className: 'nt-text-foreground-alpha-600 nt-size-3.5',
              iconKey: iconKey(),
              context: { subscription: subscription() } satisfies Parameters<
                SubscriptionAppearanceCallback['subscriptionButtonIcon']
              >[0],
            })}
            fallback={IconComponent()?.({
              class: style({
                key: 'subscriptionButtonIcon',
                className: 'nt-text-foreground-alpha-600 nt-size-3.5',
                iconKey: iconKey(),
                context: { subscription: subscription() } satisfies Parameters<
                  SubscriptionAppearanceCallback['subscriptionButtonIcon']
                >[0],
              }),
            })}
          />
        </Motion.span>
        <Motion.span
          initial={{ opacity: 1 }}
          animate={{ opacity: props.loading ? 1 : 0 }}
          transition={{ easing: 'ease-in-out', duration: 0.2 }}
          class="nt-absolute nt-left-0 nt-inline-flex nt-items-center"
        >
          <IconRendererWrapper
            iconKey="loader"
            class={style({
              key: 'subscriptionButtonIcon',
              className: 'nt-text-foreground-alpha-600 nt-size-3.5 nt-animate-spin',
              iconKey: iconKey(),
              context: { subscription: subscription() } satisfies Parameters<
                SubscriptionAppearanceCallback['subscriptionButtonIcon']
              >[0],
            })}
            fallback={
              <Loader
                class={style({
                  key: 'subscriptionButtonIcon',
                  className: 'nt-text-foreground-alpha-600 nt-size-3.5 nt-animate-spin',
                  iconKey: iconKey(),
                  context: { subscription: subscription() } satisfies Parameters<
                    SubscriptionAppearanceCallback['subscriptionButtonIcon']
                  >[0],
                })}
              />
            }
          />
        </Motion.span>
        <span
          class={style({
            key: 'subscriptionButtonLabel',
            className: '[line-height:16px]',
            context: { subscription: subscription() } satisfies Parameters<
              SubscriptionAppearanceCallback['subscriptionButtonLabel']
            >[0],
          })}
          data-localization={props.subscription ? 'subscription.unsubscribe' : 'subscription.subscribe'}
        >
          {props.subscription ? t('subscription.unsubscribe') : t('subscription.subscribe')}
        </span>
      </span>
    </Button>
  );
};
