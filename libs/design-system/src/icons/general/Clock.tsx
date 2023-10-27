/* eslint-disable max-len */

export const Clock = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 135 136" {...props}>
      <path
        fill="url(#a)"
        d="M67.5 135.159c37.279 0 67.5-30.07 67.5-67.164S104.779.831 67.5.831C30.22.831 0 30.901 0 67.995s30.22 67.164 67.5 67.164Z"
      />
      <path
        fill="url(#b)"
        d="M67.5 131.27c35.12 0 63.591-28.33 63.591-63.275S102.62 4.722 67.5 4.722c-35.12 0-63.59 28.328-63.59 63.273 0 34.945 28.47 63.275 63.59 63.275Z"
      />
      <path
        fill="url(#c)"
        d="m72.003 64.912 53.837-1.458C122.524 31.549 102.708 11.61 71.459 8.41l.545 56.503-.001-.001Z"
        opacity=".5"
      />
      <path
        fill="url(#d)"
        fillRule="evenodd"
        d="M66.746 39.241c-.8.012-1.397.433-1.397 1.666L65.3 63.81c-1.31.627-2.225 2.01-2.225 3.6 0 .658.157 1.275.434 1.813L37.866 94.636c-.49.474-.53 1.265-.092 1.764.438.5 1.188.52 1.675.046l25.766-25.563a3.54 3.54 0 0 0 1.585.334c2.055-.043 3.718-1.815 3.718-3.955 0-1.629-.962-3.005-2.327-3.553l-.048-22.842c0-1.23-.596-1.638-1.397-1.626Z"
        clipRule="evenodd"
      />
      <defs>
        <linearGradient id="a" x1="67.5" x2="67.5" y1=".831" y2="135.159" gradientUnits="userSpaceOnUse">
          <stop stopColor="#353544" stopOpacity=".91" />
          <stop offset="1" stopColor="#232335" stopOpacity=".98" />
        </linearGradient>
        <linearGradient id="b" x1="67.5" x2="67.5" y1="131.27" y2="4.722" gradientUnits="userSpaceOnUse">
          <stop stopColor="#BEBECC" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
        <linearGradient id="c" x1="71.459" x2="125.84" y1="36.662" y2="36.662" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DD2476" />
          <stop offset="1" stopColor="#FF512F" />
        </linearGradient>
        <linearGradient id="d" x1="53.994" x2="53.994" y1="39.241" y2="96.788" gradientUnits="userSpaceOnUse">
          <stop stopColor="#353544" stopOpacity=".91" />
          <stop offset="1" stopColor="#232335" stopOpacity=".98" />
        </linearGradient>
      </defs>
    </svg>
  );
};
