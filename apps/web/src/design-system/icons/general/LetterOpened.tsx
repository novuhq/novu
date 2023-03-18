/* eslint-disable max-len */

export const LetterOpened = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 148 133" {...props}>
      <path
        fill="url(#a)"
        d="M59.743 3.74 2.08 51.174a7.67 7.67 0 0 0 3.727.742l109.251-5.664a7.682 7.682 0 0 0 4.851-2.054L77.028 4.228C72.373-.11 64.689-.327 59.743 3.74Z"
      />
      <path
        fill="url(#b)"
        d="M112.86 132.169H7.688c-4.245 0-7.688-3.425-7.688-7.65V56.377c0-4.06 3.187-7.412 7.26-7.639l109.23-6.058c4.573-.254 8.354 3.503 8.105 8.054l-4.059 74.2c-.222 4.058-3.593 7.235-7.676 7.235Z"
      />
      <path
        fill="url(#c)"
        d="m62.73 91.05 57.49-47.641a7.672 7.672 0 0 0-3.73-.73L7.26 48.739a7.68 7.68 0 0 0-4.842 2.07l43.026 39.816c4.671 4.322 12.356 4.511 17.286.426Z"
      />
      <mask id="d" width="116" height="89" x="3" y="6" maskUnits="userSpaceOnUse" style={{ maskType: 'luminance' }}>
        <path
          fill="#fff"
          d="m62.729 91.06 55.651-46.118c.867-.719.43-2.117-.693-2.228-.391-.039-.791-36.314-1.197-36.29L7.26 12.481c-1.301.072-2.512 36.729-3.558 37.361-.71.43-.794 1.428-.185 1.992l41.927 38.798c4.671 4.323 12.355 4.512 17.285.426Z"
        />
      </mask>
      <g mask="url(#d)">
        <path
          fill="url(#e)"
          d="M104.237 103.569H17.643V21.445c0-3.143 2.937-5.74 6.695-5.92l72.386-3.483c4.078-.196 7.513 2.511 7.513 5.921v85.606Z"
        />
        <path
          fill="url(#f)"
          d="M101.276 103.57H20.607V27.067c0-2.928 2.737-5.348 6.238-5.516l67.432-3.244c3.798-.183 6.999 2.34 6.999 5.516v79.747Z"
        />
      </g>
      <g filter="url(#g)">
        <path
          fill="url(#h)"
          fillRule="evenodd"
          d="M90.529 88.405c12.393 0 22.529-10.055 22.529-22.41s-10.136-22.383-22.529-22.383C78.135 43.612 68 53.667 68 66.022c0 12.354 10.108 22.41 22.529 22.41v-.027Z"
          clipRule="evenodd"
        />
        <path
          fill="#fff"
          fillOpacity=".74"
          d="m87.89 74.387-6.598-6.564c-.277-.276-.277-.76 0-1.106l1.042-1.036c.278-.277.764-.277 1.111 0l5 4.975L99.556 59.6c.278-.276.764-.276 1.111 0l1.042 1.036c.278.277.278.76 0 1.106L89.001 74.387c-.348.277-.834.277-1.11 0Z"
        />
      </g>
      <defs>
        <linearGradient id="a" x1="63.845" x2="62.6" y1="46.221" y2=".782" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A9A9B9" />
          <stop offset="1" stopColor="#B1B1C6" />
        </linearGradient>
        <linearGradient id="b" x1="62.303" x2="62.303" y1="132.169" y2="42.668" gradientUnits="userSpaceOnUse">
          <stop stopColor="#BEBECC" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
        <linearGradient id="c" x1="61.319" x2="61.319" y1="42.667" y2="93.994" gradientUnits="userSpaceOnUse">
          <stop stopColor="#73738F" />
          <stop offset="1" stopColor="#21212D" />
        </linearGradient>
        <linearGradient id="e" x1="60.94" x2="60.94" y1="12.032" y2="103.569" gradientUnits="userSpaceOnUse">
          <stop stopColor="#353544" />
          <stop offset="1" stopColor="#232335" stopOpacity=".98" />
        </linearGradient>
        <linearGradient id="f" x1="60.942" x2="60.942" y1="103.57" y2="18.298" gradientUnits="userSpaceOnUse">
          <stop stopColor="#BEBECC" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
        <linearGradient id="h" x1="68" x2="113.058" y1="66.022" y2="66.022" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DD2476" />
          <stop offset="1" stopColor="#FF512F" />
        </linearGradient>
        <filter
          id="g"
          width="93.058"
          height="92.819"
          x="54"
          y="29.612"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
          <feOffset dx="10" dy="10" />
          <feGaussianBlur stdDeviation="12" />
          <feColorMatrix values="0 0 0 0 0.133333 0 0 0 0 0.160784 0 0 0 0 0.192157 0 0 0 0.24 0" />
          <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_1338_3001" />
          <feBlend in="SourceGraphic" in2="effect1_dropShadow_1338_3001" result="shape" />
        </filter>
      </defs>
    </svg>
  );
};
