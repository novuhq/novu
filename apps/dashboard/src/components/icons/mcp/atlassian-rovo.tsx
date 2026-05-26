import { useId } from 'react';

export const AtlassianRovoIcon = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  const id = useId();
  const grad = `${id}-grad`;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" {...props}>
      <path
        d="M6.43973 9.33067C6.1782 9.0511 5.7707 9.06695 5.59295 9.42268L1.30417 18.0062C1.22467 18.1653 1.23313 18.3542 1.32655 18.5055C1.41998 18.6567 1.58502 18.7488 1.76274 18.7488H7.73547C7.93098 18.7533 8.11078 18.6421 8.19413 18.4651C9.482 15.8005 8.70174 11.7491 6.43973 9.33067Z"
        fill={`url(#${grad})`}
      />
      <path
        d="M9.58608 1.52488C7.18731 5.32801 7.34557 9.54008 8.92559 12.7024L11.8056 18.4662C11.8924 18.64 12.0699 18.7498 12.2641 18.7498H18.2368C18.4145 18.7498 18.5795 18.6578 18.673 18.5065C18.7664 18.3552 18.7748 18.1663 18.6953 18.0072C18.6953 18.0072 10.6603 1.92401 10.4582 1.52161C10.2775 1.16137 9.81843 1.15647 9.58608 1.52488Z"
        fill="#2681FF"
      />
      <defs>
        <linearGradient id={grad} x1="5.70314" y1="7.77904" x2="-0.314159" y2="14.2383" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0052CC" />
          <stop offset="0.923" stopColor="#2684FF" />
        </linearGradient>
      </defs>
    </svg>
  );
};
