export const LogoCircle = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" {...props}>
      <path
        fill="url(#a)"
        fillRule="evenodd"
        d="M11.24 6.809a.36.36 0 0 1-.617.251l-4.62-4.72A6 6 0 0 1 8 1.998c1.194 0 2.306.349 3.24.95v3.86Zm1.68-2.245v2.245c0 1.828-2.22 2.733-3.498 1.426L4.454 3.158A5.992 5.992 0 0 0 2 8c0 1.278.4 2.462 1.08 3.435V9.201c0-1.828 2.22-2.733 3.498-1.426l4.96 5.07A5.991 5.991 0 0 0 14 7.999c0-1.278-.4-2.462-1.08-3.435ZM5.377 8.95l4.61 4.712A5.985 5.985 0 0 1 8 13.998a5.975 5.975 0 0 1-3.24-.95V9.202a.36.36 0 0 1 .617-.251Z"
        clipRule="evenodd"
      />
      <path
        fill="url(#b)"
        fillRule="evenodd"
        d="M11.24 6.809a.36.36 0 0 1-.617.251l-4.62-4.72A6 6 0 0 1 8 1.998c1.194 0 2.306.349 3.24.95v3.86Zm1.68-2.245v2.245c0 1.828-2.22 2.733-3.498 1.426L4.454 3.158A5.992 5.992 0 0 0 2 8c0 1.278.4 2.462 1.08 3.435V9.201c0-1.828 2.22-2.733 3.498-1.426l4.96 5.07A5.991 5.991 0 0 0 14 7.999c0-1.278-.4-2.462-1.08-3.435ZM5.377 8.95l4.61 4.712A5.985 5.985 0 0 1 8 13.998a5.975 5.975 0 0 1-3.24-.95V9.202a.36.36 0 0 1 .617-.251Z"
        clipRule="evenodd"
      />
      <path
        fill="url(#c)"
        fillRule="evenodd"
        d="M11.24 6.809a.36.36 0 0 1-.617.251l-4.62-4.72A6 6 0 0 1 8 1.998c1.194 0 2.306.349 3.24.95v3.86Zm1.68-2.245v2.245c0 1.828-2.22 2.733-3.498 1.426L4.454 3.158A5.992 5.992 0 0 0 2 8c0 1.278.4 2.462 1.08 3.435V9.201c0-1.828 2.22-2.733 3.498-1.426l4.96 5.07A5.991 5.991 0 0 0 14 7.999c0-1.278-.4-2.462-1.08-3.435ZM5.377 8.95l4.61 4.712A5.985 5.985 0 0 1 8 13.998a5.975 5.975 0 0 1-3.24-.95V9.202a.36.36 0 0 1 .617-.251Z"
        clipRule="evenodd"
      />
      <defs>
        <linearGradient id="b" x1="9.4" x2="8" y1="1.599" y2="13.999" gradientUnits="userSpaceOnUse">
          <stop offset=".085" stopColor="#FFBA33" />
          <stop offset=".553" stopColor="#FF006A" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="c" x1="8" x2="8" y1="1.999" y2="13.999" gradientUnits="userSpaceOnUse">
          <stop offset=".547" stopOpacity="0" />
          <stop offset="1" stopOpacity=".6" />
        </linearGradient>
        <radialGradient
          id="a"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="matrix(-6 6 -6 -6 8 8)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".34" stopColor="#FF006A" />
          <stop offset=".613" stopColor="#E300BD" />
          <stop offset=".767" stopColor="#FF4CE1" />
        </radialGradient>
      </defs>
    </svg>
  );
};
