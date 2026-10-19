import * as SwitchPrimitives from '@radix-ui/react-switch';
import * as React from 'react';
import { cn } from '../../utils/ui';

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, disabled, ...rest }, forwardedRef) => {
  const [showDisabledCursor, setShowDisabledCursor] = React.useState(false);
  React.useEffect(() => {
    if (!disabled) {
      setShowDisabledCursor(false);
      return;
    }
    const t = setTimeout(() => setShowDisabledCursor(true), 150);
    return () => clearTimeout(t);
  }, [disabled]);

  return (
    <SwitchPrimitives.Root
      ref={forwardedRef}
      disabled={disabled}
      className={cn(
        // base
        'group/switch relative inline-flex h-[16px] w-[28px] shrink-0 cursor-pointer items-center rounded-full outline-none transition-all',
        'bg-bg-soft',
        'before:absolute before:inset-0 before:rounded-full before:content-[""] before:shadow-switch-track',
        'after:absolute after:inset-0 after:rounded-full after:content-[""] after:bg-linear-to-b after:from-black/5 after:to-transparent after:opacity-0 after:transition-opacity',
        !disabled && [
          // hover
          'hover:bg-bg-sub data-[state=unchecked]:hover:after:opacity-100',
          // focus
          'focus-visible:shadow-switch-track-focus',
          // pressed
          'active:bg-bg-soft',
          // checked
          'data-[state=checked]:bg-primary-base',
          // checked hover
          'data-[state=checked]:hover:bg-primary-darker',
          // checked pressed
          'data-[state=checked]:active:bg-primary-base',
          // focus
          'focus:outline-none',
        ],
        // disabled
        disabled && [
          showDisabledCursor && 'cursor-not-allowed',
          'bg-bg-soft!',
          'before:shadow-switch-track-disabled after:opacity-0',
        ],
        className
      )}
      {...rest}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          // base
          'pointer-events-none block h-[12px] w-[12px] shrink-0 rounded-full transition-transform',
          'translate-x-0.5 data-[state=checked]:translate-x-[14px]',
          !disabled && [
            // default
            'bg-static-white shadow-switch-handle',
            // pressed
            'group-active/switch:scale-90',
          ],
          // disabled
          disabled && 'bg-static-white! shadow-switch-handle-disabled!'
        )}
      />
    </SwitchPrimitives.Root>
  );
});
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
