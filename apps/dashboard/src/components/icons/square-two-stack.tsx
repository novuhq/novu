export const SquareTwoStack = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 13 12" {...props}>
      <g clipPath="url(#a)">
        <path
          stroke="currentColor"
          d="M9 3.499v-1a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1m2-5h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2Z"
        />
      </g>
      <defs>
        <clipPath id="a">
          <path fill="#fff" d="M.5-.001h12v12H.5z" />
        </clipPath>
      </defs>
    </svg>
  );
};
