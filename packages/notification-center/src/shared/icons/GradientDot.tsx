import React from 'react';
import type { INotificationBellColors, ISvgStopColor } from '../../store/novu-theme.context';

interface IGradientDotProps {
  props?: React.ComponentPropsWithoutRef<'svg'>;
  colors: INotificationBellColors;
  className?: string;
  width?: string;
  height?: string;
}

/* eslint-disable */
export function GradientDot(props: IGradientDotProps) {
  const color = props.colors.unseenBadgeColor;
  const regularColor = typeof color === 'string';

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}>
      <rect
        x="1.5"
        y="1.5"
        width="13"
        height="13"
        rx="6.5"
        fill="url(#paint0_linear_1722_2699)"
        stroke={props.colors.unseenBadgeBackgroundColor}
        strokeWidth="3"
      />
      <defs>
        <linearGradient id="paint0_linear_1722_2699" x1="8" y1="13" x2="8" y2="3" gradientUnits="userSpaceOnUse">
          <stop stopColor={regularColor ? (color as string) : (color as ISvgStopColor).stopColor} />
          <stop offset="1" stopColor={regularColor ? (color as string) : (color as ISvgStopColor).stopColorOffset} />
        </linearGradient>
      </defs>
    </svg>
  );
}
