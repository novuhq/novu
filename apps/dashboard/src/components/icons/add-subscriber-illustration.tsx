import type { HTMLAttributes } from 'react';

type AddSubscriberIllustrationProps = HTMLAttributes<HTMLOrSVGElement>;
export const AddSubscriberIllustration = (props: AddSubscriberIllustrationProps) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="137" height="126" fill="none" {...props}>
      <rect width="135" height="45" x="1" y="80" stroke="#CACFD8" strokeDasharray="5 3" rx="7.5" />
      <rect width="127" height="37" x="5" y="84" fill="#fff" rx="5.5" />
      <rect width="127" height="37" x="5" y="84" stroke="#F2F5F8" rx="5.5" />
      <path fill="#99A0AE" d="M68.125 102.125v-2.25h.75v2.25h2.25v.75h-2.25v2.25h-.75v-2.25h-2.25v-.75h2.25Z" />
      <rect width="135" height="45" x="1" y="1" stroke="#DD2450" rx="7.5" />
      <rect width="128" height="38" x="4.5" y="4.5" fill="#fff" rx="6" />
      <rect width="127" height="37" x="5" y="5" stroke="#FB3748" strokeOpacity=".24" rx="5.5" />

      <g transform="translate(60, 15)">
        <path
          fill="#D82651"
          d="M7.03 8.2a1.35 1.35 0 1 1 0-2.7 1.35 1.35 0 0 1 0 2.7Zm.27 4.949V11.14c0-.293.086-.562.242-.803a3.883 3.883 0 0 0-3.02.85A4.807 4.807 0 0 0 7.3 13.15Zm-3.328-3.053A5.077 5.077 0 0 1 7 9.1c.626 0 1.226.113 1.78.32a5.057 5.057 0 0 1 1.82-.32c.996 0 1.911.254 2.524.694a4.8 4.8 0 1 0-9.152.302Zm8.655.856c-.235-.32-1.024-.652-2.027-.652-1.204 0-2.1.478-2.1.84v2.16a4.797 4.797 0 0 0 4.128-2.348ZM8.5 14.5a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm2.1-5.7a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Z"
        />
      </g>

      <path stroke="#CACFD8" strokeDasharray="5 3" strokeLinejoin="bevel" strokeWidth="1.33" d="M68.5 49.665v26.67" />
    </svg>
  );
};
