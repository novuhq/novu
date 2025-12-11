import * as CheckboxPrimitive from '@kobalte/core/checkbox';
import type { PolymorphicProps } from '@kobalte/core/polymorphic';
import type { ValidComponent } from 'solid-js';
import { Match, Switch, splitProps } from 'solid-js';
import { cn } from '../../helpers/utils';

type CheckboxRootProps<T extends ValidComponent = 'div'> = CheckboxPrimitive.CheckboxRootProps<T> & {
  class?: string | undefined;
};

const Checkbox = <T extends ValidComponent = 'div'>(props: PolymorphicProps<T, CheckboxRootProps<T>>) => {
  const [local, others] = splitProps(props as CheckboxRootProps, ['id', 'class']);
  return (
    <CheckboxPrimitive.Root class={cn('nt-items-top nt-group nt-relative nt-flex', local.class)} {...others}>
      <CheckboxPrimitive.Input class="nt-peer" id={local.id} />
      <CheckboxPrimitive.Control class="nt-size-4 nt-shrink-0 nt-rounded-sm nt-border nt-border-primary nt-ring-offset-background data-[disabled]:nt-cursor-not-allowed data-[disabled]:nt-opacity-50 peer-focus-visible:nt-outline-none peer-focus-visible:nt-ring-2 peer-focus-visible:ntring-ring peer-focus-visible:nt-ring-offset-2 data-[checked]:nt-border-none data-[indeterminate]:nt-border-none data-[checked]:nt-bg-primary data-[indeterminate]:nt-bg-primary data-[checked]:nt-text-primary-foreground data-[indeterminate]:nt-text-primary-foreground">
        <CheckboxPrimitive.Indicator>
          <Switch>
            <Match when={!others.indeterminate}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="size-4"
              >
                <path d="M5 12l5 5l10 -10" />
              </svg>
            </Match>
            <Match when={others.indeterminate}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="size-4"
              >
                <path d="M5 12l14 0" />
              </svg>
            </Match>
          </Switch>
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Control>
    </CheckboxPrimitive.Root>
  );
};

export { Checkbox };
