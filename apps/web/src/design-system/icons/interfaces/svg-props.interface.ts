import React from 'react';

export interface ISvgPropsInterface extends React.ComponentPropsWithoutRef<'svg'> {
  disabled?: boolean;
  width?: string;
  height?: string;
  stopColor?: string;
  offSetStopColor?: string;
}
