export const MagicIcon = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" {...props}>
      <rect width="24" height="24" rx="4" />
      <mask id="a" width="16" height="16" x="4" y="4" maskUnits="userSpaceOnUse" style={{ maskType: 'alpha' }}>
        <path fill="#D9D9D9" d="M4 4h16v16H4z" />
      </mask>
      <g mask="url(#a)">
        <path
          fill="currentColor"
          // eslint-disable-next-line max-len
          d="m16.667 10-.834-1.833L14 7.333l1.833-.833.834-1.833L17.5 6.5l1.833.833-1.833.834L16.667 10Zm0 9.333-.834-1.833L14 16.667l1.833-.834.834-1.833.833 1.833 1.833.834-1.833.833-.833 1.833Zm-6.667-2-1.667-3.666L4.667 12l3.666-1.667L10 6.667l1.667 3.666L15.333 12l-3.666 1.667L10 17.333Zm0-3.233.667-1.433L12.1 12l-1.433-.667L10 9.9l-.667 1.433L7.9 12l1.433.667L10 14.1Z"
        />
      </g>
    </svg>
  );
};
