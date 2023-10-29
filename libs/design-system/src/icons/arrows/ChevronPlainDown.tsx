export const ChevronPlainDown = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="m12 13.94 5.47-5.47 1.06 1.06L12 16.06 5.47 9.53l1.06-1.06L12 13.94Z"
        clipRule="evenodd"
      />
    </svg>
  );
};
