// AlignUI Checkbox v0.0.0

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as React from 'react';
import { cn } from '../../utils/ui';

function IconCheck({ ...rest }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M1 3.5L4 6.5L9 1.5" strokeWidth="1.5" className="stroke-static-white" />
    </svg>
  );
}

function IconIndeterminate({ ...rest }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="8" height="2" viewBox="0 0 8 2" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M0 1H8" strokeWidth="1.5" className="stroke-static-white" />
    </svg>
  );
}

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, checked, ...rest }, forwardedRef) => {
  const filterId = React.useId();

  // precalculated by .getTotalLength()
  const TOTAL_LENGTH_CHECK = 11.313708305358887;
  const TOTAL_LENGTH_INDETERMINATE = 8;

  return (
    <CheckboxPrimitive.Root
      ref={forwardedRef}
      checked={checked}
      className={cn(
        'group/checkbox relative flex size-5 shrink-0 items-center justify-center outline-none',
        'focus:outline-none',
        className
      )}
      {...rest}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect
          x="2"
          y="2"
          width="16"
          height="16"
          rx="4"
          className={cn(
            'fill-bg-soft transition duration-200 ease-out',
            // hover
            'group-hover/checkbox:fill-bg-sub',
            // focus
            'group-focus/checkbox:fill-primary-base',
            // disabled
            'group-disabled/checkbox:fill-bg-soft',
            // hover
            'group-hover/checkbox:group-data-[state=checked]/checkbox:fill-primary-darker',
            'group-hover/checkbox:group-data-[state=indeterminate]/checkbox:fill-primary-darker',
            // focus
            'group-focus/checkbox:group-data-[state=checked]/checkbox:fill-primary-dark',
            'group-focus/checkbox:group-data-[state=indeterminate]/checkbox:fill-primary-dark',
            // checked
            'group-data-[state=checked]/checkbox:fill-primary-base',
            'group-data-[state=indeterminate]/checkbox:fill-primary-base',
            // disabled checked
            'group-disabled/checkbox:group-data-[state=checked]/checkbox:fill-bg-soft',
            'group-disabled/checkbox:group-data-[state=indeterminate]/checkbox:fill-bg-soft'
          )}
        />
        <g filter={`url(#${filterId})`}>
          <rect
            x="3.5"
            y="3.5"
            width="13"
            height="13"
            rx="2.6"
            className={cn(
              'fill-bg-white transition duration-200 ease-out',
              // disabled
              'group-disabled/checkbox:hidden',
              // checked
              'group-data-[state=checked]/checkbox:opacity-0',
              'group-data-[state=indeterminate]/checkbox:opacity-0'
            )}
          />
        </g>
        <defs>
          <filter
            id={filterId}
            x="1.5"
            y="3.5"
            width="17"
            height="17"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset dy="2" />
            <feGaussianBlur stdDeviation="1" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.105882 0 0 0 0 0.109804 0 0 0 0 0.113725 0 0 0 0.12 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_34646_2602" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_34646_2602" result="shape" />
          </filter>
        </defs>
      </svg>
      <CheckboxPrimitive.Indicator
        forceMount
        className="[&_path]:transition-all [&_path]:duration-300 [&_path]:ease-out [&_svg]:opacity-0"
      >
        <IconCheck
          className={cn(
            'absolute left-1/2 top-1/2 shrink-0 -translate-x-1/2 -translate-y-1/2',
            // checked
            'group-data-[state=checked]/checkbox:opacity-100',
            'group-data-[state=checked]/checkbox:[&>path]:[stroke-dashoffset:0]',
            // path
            '[&>path]:[stroke-dasharray:var(--total-length)] [&>path]:[stroke-dashoffset:var(--total-length)]',
            'group-data-[state=indeterminate]/checkbox:invisible'
          )}
          style={{
            ['--total-length' as any]: TOTAL_LENGTH_CHECK,
          }}
        />
        <IconIndeterminate
          className={cn(
            'absolute left-1/2 top-1/2 shrink-0 -translate-x-1/2 -translate-y-1/2',
            // indeterminate
            'group-data-[state=indeterminate]/checkbox:opacity-100',
            'group-data-[state=indeterminate]/checkbox:[&>path]:[stroke-dashoffset:0]',
            // path
            '[&>path]:[stroke-dasharray:var(--total-length)] [&>path]:[stroke-dashoffset:var(--total-length)]',
            'invisible group-data-[state=indeterminate]/checkbox:visible'
          )}
          style={{
            ['--total-length' as any]: TOTAL_LENGTH_INDETERMINATE,
          }}
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
