import type { HTMLAttributes } from 'react';

type VersionControlProdProps = HTMLAttributes<HTMLOrSVGElement>;

export const VersionControlProd = (props: VersionControlProdProps) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="137" height="126" fill="none" {...props}>
      <rect width="135" height="45" x="1" y="80" stroke="#7D52F4" rx="7.5" />
      <rect width="128" height="38" x="4.5" y="83.5" fill="#fff" rx="6" />
      <rect width="127" height="37" x="5" y="84" stroke="#7D52F4" strokeOpacity=".1" rx="5.5" />
      <path
        fill="#7D52F4"
        d="M65.563 100.574A1.803 1.803 0 0 0 67.3 101.9h2.4a3.001 3.001 0 0 1 2.956 2.488 1.799 1.799 0 0 1 .612 3.08 1.8 1.8 0 1 1-1.831-3.042A1.803 1.803 0 0 0 69.7 103.1h-2.4a2.988 2.988 0 0 1-1.8-.6v1.902a1.8 1.8 0 1 1-1.2 0v-3.804a1.798 1.798 0 0 1-1.178-1.985 1.801 1.801 0 1 1 2.44 1.961Z"
      />
      <rect width="135" height="45" x="1" y="1" stroke="#CACFD8" strokeDasharray="5 3" rx="7.5" />
      <rect width="127" height="37" x="5" y="5" fill="#fff" rx="5.5" />
      <rect width="127" height="37" x="5" y="5" stroke="#F2F5F8" rx="5.5" />
      <path
        fill="#99A0AE"
        d="M69.953 23.875a1.5 1.5 0 0 1-2.906 0h-1.922v-.75h1.922a1.5 1.5 0 0 1 2.906 0h1.922v.75h-1.922Z"
      />
      <path stroke="#CACFD8" strokeDasharray="5 3" strokeLinejoin="bevel" strokeWidth="1.33" d="M68.5 49.665v26.67" />
    </svg>
  );
};
