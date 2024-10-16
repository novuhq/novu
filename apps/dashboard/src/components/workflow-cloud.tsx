import type { HTMLAttributes } from 'react';

type WorkflowCloudProps = HTMLAttributes<HTMLOrSVGElement>;
export const WorkflowCloud = (props: WorkflowCloudProps) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="153" height="120" fill="none" {...props}>
      <circle cx="76.5" cy="52" r="52" fill="#F4F5F6" />
      <g filter="url(#a)">
        <path
          fill="#FBFBFB"
          d="M78.1 16c-10.773 0-20.302 5.323-26.101 13.483A25.672 25.672 0 0 0 46.1 28.8c-14.139 0-25.6 11.461-25.6 25.6C20.5 68.539 31.962 80 46.1 80h64c12.371 0 22.4-10.029 22.4-22.4 0-12.371-10.029-22.4-22.4-22.4-.879 0-1.746.05-2.598.149C102.598 23.968 91.28 16 78.1 16Z"
        />
        <circle cx="46.1" cy="54.4" r="25.6" fill="url(#b)" />
        <circle cx="78.1" cy="48" r="32" fill="url(#c)" />
        <circle cx="110.1" cy="57.6" r="22.4" fill="url(#d)" />
      </g>
      <circle cx="21.5" cy="19" r="5" fill="#FBFBFB" />
      <circle cx="18.5" cy="109" r="7" fill="#FBFBFB" />
      <circle cx="145.5" cy="35" r="7" fill="#FBFBFB" />
      <circle cx="134.5" cy="8" r="4" fill="#FBFBFB" />
      <g filter="url(#e)">
        <path
          fill="#99A0AE"
          fillOpacity=".1"
          d="M76 85.5c0-13.255 10.745-24 24-24s24 10.745 24 24-10.745 24-24 24-24-10.745-24-24Z"
        />
        <path
          fill="#fff"
          d="M90.4 89.1v-7.8a5.4 5.4 0 0 1 10.8 0v8.4a3.002 3.002 0 0 0 3 3 3 3 0 0 0 3-3v-8.004a3.601 3.601 0 1 1 2.4 0V89.7a5.4 5.4 0 1 1-10.8 0v-8.4a3 3 0 0 0-6 0v7.8h3.6l-4.8 6-4.8-6h3.6Z"
        />
      </g>
      <defs>
        <linearGradient id="b" x1="26.443" x2="71.7" y1="37.486" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D0D5DD" stopOpacity=".75" />
          <stop offset=".351" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="c" x1="53.529" x2="110.1" y1="26.857" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D0D5DD" stopOpacity=".75" />
          <stop offset=".351" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="d" x1="92.9" x2="132.5" y1="42.8" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D0D5DD" stopOpacity=".75" />
          <stop offset=".351" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter
          id="a"
          width="152"
          height="104"
          x=".5"
          y="16"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
          <feMorphology in="SourceAlpha" radius="4" result="effect1_dropShadow_2411_21338" />
          <feOffset dy="8" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix values="0 0 0 0 0.0627451 0 0 0 0 0.0941176 0 0 0 0 0.156863 0 0 0 0.03 0" />
          <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_2411_21338" />
          <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
          <feMorphology in="SourceAlpha" radius="4" result="effect2_dropShadow_2411_21338" />
          <feOffset dy="20" />
          <feGaussianBlur stdDeviation="12" />
          <feColorMatrix values="0 0 0 0 0.0627451 0 0 0 0 0.0941176 0 0 0 0 0.156863 0 0 0 0.08 0" />
          <feBlend in2="effect1_dropShadow_2411_21338" result="effect2_dropShadow_2411_21338" />
          <feBlend in="SourceGraphic" in2="effect2_dropShadow_2411_21338" result="shape" />
        </filter>
        <filter
          id="e"
          width="64"
          height="64"
          x="68"
          y="53.5"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feGaussianBlur in="BackgroundImageFix" stdDeviation="4" />
          <feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_2411_21338" />
          <feBlend in="SourceGraphic" in2="effect1_backgroundBlur_2411_21338" result="shape" />
        </filter>
      </defs>
    </svg>
  );
};
