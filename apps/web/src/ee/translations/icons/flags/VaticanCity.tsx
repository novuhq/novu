import React from 'react';

export function VaticanCity(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_194145)">
        <path d="M20 0c11.045 0 20 8.954 20 20s-8.955 20-20 20c0-.87-2.61-20-2.61-20L20 0z" fill="#F0F0F0" />
        <path d="M20 40C8.954 40 0 31.046 0 20S8.954 0 20 0" fill="#FFDA44" />
        <path
          d="M27.659 17.403l3.759 4.973a2.61 2.61 0 101.387-1.049l-5.858-7.75-1.387 1.05-2.081 1.572 2.097 2.775 2.083-1.57zm5.411 5.717a.87.87 0 111.049 1.387.87.87 0 01-1.049-1.387z"
          fill="#ACABB1"
        />
        <path
          d="M34.106 18.974l2.097-2.774-2.08-1.574-1.388-1.048-5.858 7.75a2.61 2.61 0 101.387 1.048l3.759-4.973 2.083 1.571zm-7.325 5.364a.87.87 0 11-1.387-1.048.87.87 0 011.387 1.048z"
          fill="#FFDA44"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_194145">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
