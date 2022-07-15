import React from 'react';

export interface IIconProps {
  width?: string;
  height?: string;
  color: string;
}
/* eslint-disable */
export function Digest({ width = '24', height = '26', color }: IIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
    >
      <path
        d="M1 19L12 25L23 19M1 13L12 19L23 13M12 1L1 7L12 13L23 7L12 1Z"
        stroke={color}
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
