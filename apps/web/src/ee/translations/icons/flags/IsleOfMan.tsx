import React from 'react';

export function IsleOfMan(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_192783)">
        <path d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20z" fill="#D80027" />
        <path
          d="M27.405 13.407l-1.414 5.045-4.241-.784-2.73-5.627-7.376 2.617-.582-1.639-1.93-.238 1.455 4.098 5.075-1.298 1.443 4.064-3.509 5.179 5.955 5.078-1.129 1.324.759 1.79 2.822-3.308-3.662-3.747 2.799-3.281 6.238.45 1.421-7.697 1.71.316 1.172-1.553-4.276-.789z"
          fill="#F0F0F0"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_192783">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
