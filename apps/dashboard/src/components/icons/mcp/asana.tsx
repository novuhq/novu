import { useId } from 'react';

export const AsanaIcon = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  const id = useId();
  const grad = `${id}-grad`;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" {...props}>
      <path
        d="M10 1.25C5.17383 1.25 1.25 5.17383 1.25 10C1.25 14.8262 5.17383 18.75 10 18.75C14.8262 18.75 18.75 14.8262 18.75 10C18.75 5.17383 14.8262 1.25 10 1.25Z"
        fill={`url(#${grad})`}
      />
      <path
        d="M12.8252 9.9632C11.624 9.9632 10.6504 10.9508 10.6504 12.169C10.6504 13.3874 11.624 14.375 12.8252 14.375C14.0263 14.375 15 13.3874 15 12.169C15 10.9508 14.0263 9.9632 12.8252 9.9632ZM7.17482 9.96335C5.97373 9.96335 5 10.9508 5 12.1691C5 13.3874 5.97373 14.375 7.17482 14.375C8.37597 14.375 9.34974 13.3874 9.34974 12.1691C9.34974 10.9508 8.37597 9.96335 7.17482 9.96335ZM12.1748 7.20582C12.1748 8.42409 11.2011 9.41188 10.0001 9.41188C8.79886 9.41188 7.8252 8.42409 7.8252 7.20582C7.8252 5.98763 8.79886 5 10.0001 5C11.2011 5 12.1748 5.98763 12.1748 7.20582Z"
        fill="white"
      />
      <defs>
        <radialGradient
          id={grad}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(10 10.8141) scale(11.5961)"
        >
          <stop stopColor="#FFB900" />
          <stop offset="0.6" stopColor="#F95D8F" />
          <stop offset="0.9991" stopColor="#F95353" />
        </radialGradient>
      </defs>
    </svg>
  );
};
