import type { HTMLAttributes } from 'react';

type VersionControlDevProps = HTMLAttributes<HTMLOrSVGElement>;

export const VersionControlDev = (props: VersionControlDevProps) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="137" height="126" fill="none" {...props}>
      <rect width="135" height="45" x="1" y="80" stroke="#CACFD8" strokeDasharray="5 3" rx="7.5" />
      <rect width="127" height="37" x="5" y="84" fill="#fff" rx="5.5" />
      <rect width="127" height="37" x="5" y="84" stroke="#F2F5F8" rx="5.5" />
      <path fill="#99A0AE" d="M68.125 102.125v-2.25h.75v2.25h2.25v.75h-2.25v2.25h-.75v-2.25h-2.25v-.75h2.25Z" />
      <rect width="135" height="45" x="1" y="1" stroke="#DD2450" rx="7.5" />
      <rect width="128" height="38" x="4.5" y="4.5" fill="#fff" rx="6" />
      <rect width="127" height="37" x="5" y="5" stroke="#FB3748" strokeOpacity=".24" rx="5.5" />
      <path
        fill="#D82651"
        d="M63.7 25.3v-3.9a2.7 2.7 0 0 1 5.4 0v4.2a1.5 1.5 0 1 0 3 0v-4.002a1.8 1.8 0 1 1 1.2 0V25.6a2.7 2.7 0 0 1-5.4 0v-4.2a1.5 1.5 0 1 0-3 0v3.9h1.8l-2.4 3-2.4-3h1.8Z"
      />
      <path stroke="#CACFD8" strokeDasharray="5 3" strokeLinejoin="bevel" strokeWidth="1.33" d="M68.5 49.665v26.67" />
    </svg>
  );
};
