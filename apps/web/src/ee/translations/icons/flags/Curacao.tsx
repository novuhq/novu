import React from 'react';

export function Curacao(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_192631)">
        <path d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20z" fill="#FFDA44" />
        <path
          d="M20 40c6.563 0 12.387-3.16 16.034-8.043H3.967C7.614 36.84 13.437 40 20 40zM40 20C40 8.954 31.046 0 20 0S0 8.954 0 20c0 2.365.412 4.634 1.165 6.74h37.67A19.96 19.96 0 0040 20z"
          fill="#0052B4"
        />
        <path
          d="M13.689 12.827l1.079 3.32h3.492l-2.825 2.054 1.08 3.321-2.826-2.052-2.826 2.052 1.08-3.321-2.826-2.053h3.492l1.08-3.321zM7.692 9.348l.648 1.993h2.095L8.74 12.573l.647 1.993-1.695-1.232-1.695 1.232.647-1.993L4.95 11.34h2.096l.647-1.993z"
          fill="#F0F0F0"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_192631">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
