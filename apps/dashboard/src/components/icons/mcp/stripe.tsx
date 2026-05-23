import { useId } from 'react';

export const StripeIcon = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  const id = useId();
  const clip = `${id}-clip`;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" {...props}>
      <g clipPath={`url(#${clip})`}>
        <path d="M1 1H19V19H1V1Z" fill="#523AFF" />
        <path
          d="M14.0939 5.89453C14.1205 5.93007 14.1099 6.54012 14.1099 6.62511L14.1098 8.01586L14.1105 12.3802C13.8629 12.3981 13.4472 12.502 13.191 12.5557L11.2667 12.9719L5.90751 14.1062L5.89027 14.0931C5.87556 13.931 5.88714 13.5869 5.8872 13.4086L5.88771 12.0179L5.88735 7.64209C6.35022 7.58031 6.81648 7.45587 7.27393 7.3557L9.36021 6.90901L12.6269 6.20799C13.0943 6.10759 13.6368 6.00555 14.0939 5.89453Z"
          fill="#FEFEFE"
        />
      </g>
      <defs>
        <clipPath id={clip}>
          <rect x="1" y="1" width="18" height="18" rx="2" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
