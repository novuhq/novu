import React from 'react';

export function Send(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="10" viewBox="0 0 11 10" fill="none" {...props}>
      <g clipPath="url(#clip0_244_395791)">
        <path
          d="M5.22855 5.4522C5.14892 5.37271 5.05402 5.31018 4.94957 5.26836L1.6454 3.94336C1.60595 3.92753 1.57228 3.90001 1.54892 3.86449C1.52557 3.82898 1.51363 3.78717 1.51472 3.74467C1.51581 3.70218 1.52987 3.66103 1.55501 3.62676C1.58016 3.59249 1.61519 3.56673 1.6554 3.55294L9.57207 0.844606C9.60899 0.831271 9.64894 0.828726 9.68725 0.837269C9.72557 0.845812 9.76065 0.86509 9.78841 0.892847C9.81617 0.920603 9.83544 0.955691 9.84399 0.994004C9.85253 1.03232 9.84999 1.07227 9.83665 1.10919L7.12832 9.02586C7.11453 9.06607 7.08877 9.10109 7.0545 9.12624C7.02022 9.15139 6.97908 9.16545 6.93658 9.16654C6.89409 9.16763 6.85228 9.15569 6.81676 9.13233C6.78125 9.10897 6.75373 9.07531 6.7379 9.03586L5.4129 5.73086C5.37089 5.62648 5.30818 5.53169 5.22855 5.4522ZM5.22855 5.4522L9.78707 0.894571"
          stroke={props.className ? 'currentColor' : 'url(#paint0_linear_244_395791)'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <linearGradient
          id="paint0_linear_244_395791"
          x1="1.51465"
          y1="4.98521"
          x2="9.84891"
          y2="5.0204"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#939292" />
          <stop offset="1" stopColor="#646464" />
        </linearGradient>
        <clipPath id="clip0_244_395791">
          <rect width="10" height="10" fill="white" transform="translate(0.681152)" />
        </clipPath>
      </defs>
    </svg>
  );
}
