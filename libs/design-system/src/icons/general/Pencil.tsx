/* eslint-disable max-len */
import React from 'react';

export function Pencil(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" viewBox="0 0 64 64" {...props}>
      <g clipPath="url(#clip0_1481_2250)">
        <rect width="64" height="64" fill="#525266" rx="32"></rect>
        <g clipPath="url(#clip1_1481_2250)">
          <mask
            id="mask0_1481_2250"
            style={{ maskType: 'luminance' }}
            width="64"
            height="64"
            x="0"
            y="0"
            maskUnits="userSpaceOnUse"
          >
            <path
              fill="#fff"
              d="M64 32C64 14.327 49.673 0 32 0 14.327 0 0 14.327 0 32c0 17.673 14.327 32 32 32 17.673 0 32-14.327 32-32z"
            ></path>
          </mask>
          <g mask="url(#mask0_1481_2250)">
            <path
              fill="#525266"
              d="M32 64c17.673 0 32-14.327 32-32C64 14.327 49.673 0 32 0 14.327 0 0 14.327 0 32c0 17.673 14.327 32 32 32z"
            ></path>
            <mask
              id="mask1_1481_2250"
              style={{ maskType: 'luminance' }}
              width="123"
              height="51"
              x="13"
              y="24"
              maskUnits="userSpaceOnUse"
            >
              <path fill="#fff" d="M135.285 24.098H13.098v50.36h122.187v-50.36z"></path>
            </mask>
            <g mask="url(#mask1_1481_2250)">
              <path
                fill="url(#paint0_linear_1481_2250)"
                d="M132.866 60.922L41.937 28.56l-4.81 13.373 90.897 33.267a4.24 4.24 0 005.12-1.855c1.062-1.826 2.078-4.679 2.139-8.953a3.632 3.632 0 00-2.417-3.469z"
              ></path>
              <path
                fill="url(#paint1_linear_1481_2250)"
                d="M13.808 25.103l12.56 1.543c-.013 1.73-.58 3.968-2.495 6.536l-10.49-6.925c-.556-.367-.237-1.236.425-1.154z"
              ></path>
              <path
                fill="url(#paint2_linear_1481_2250)"
                d="M41.939 28.558c.575 8.381-4.81 13.373-4.81 13.373l-13.256-8.75c1.916-2.568 2.482-4.806 2.495-6.536l15.57 1.913z"
              ></path>
            </g>
          </g>
        </g>
      </g>
      <defs>
        <linearGradient
          id="paint0_linear_1481_2250"
          x1="59.742"
          x2="68.161"
          y1="65.552"
          y2="28.626"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.132" stopColor="#A9A9B9"></stop>
          <stop offset="0.883" stopColor="#fff"></stop>
        </linearGradient>
        <linearGradient
          id="paint1_linear_1481_2250"
          x1="19.733"
          x2="19.733"
          y1="25.098"
          y2="33.182"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#353544" stopOpacity="0.91"></stop>
          <stop offset="1" stopColor="#232335" stopOpacity="0.98"></stop>
        </linearGradient>
        <linearGradient
          id="paint2_linear_1481_2250"
          x1="23.873"
          x2="41.982"
          y1="34.288"
          y2="34.288"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#E185AE"></stop>
          <stop offset="1" stopColor="#F09990"></stop>
        </linearGradient>
        <clipPath id="clip0_1481_2250">
          <rect width="64" height="64" fill="#fff" rx="32"></rect>
        </clipPath>
        <clipPath id="clip1_1481_2250">
          <path fill="#fff" d="M0 0H64V64H0z"></path>
        </clipPath>
      </defs>
    </svg>
  );
}
