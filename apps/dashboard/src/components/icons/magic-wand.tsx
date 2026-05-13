export const MagicWand = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" {...props}>
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.33"
        d="M10 2.667V1.334m0 9.333V9.334M5.333 6.001h1.334m6.666 0h1.334m-2.8 1.866.8.8M10 6.001h.007m1.86-1.867.8-.8M2 14.001l6-6m.133-3.867-.8-.8"
      />
    </svg>
  );
};
