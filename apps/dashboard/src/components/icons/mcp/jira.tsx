import { useId } from 'react';

export const JiraIcon = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  const id = useId();
  const a = `${id}-a`;
  const b = `${id}-b`;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" {...props}>
      <path
        d="M18.5405 9.5103L10.7547 1.97994L10 1.25L4.13918 6.91856L1.45954 9.5103C1.18015 9.78085 1.18015 10.2191 1.45954 10.4897L6.81405 15.6686L10 18.75L15.8608 13.0814L15.9516 12.9937L18.5405 10.4897C18.8198 10.2191 18.8198 9.78085 18.5405 9.5103ZM10 12.5871L7.32514 10L10 7.41288L12.6749 10L10 12.5871Z"
        fill="#2684FF"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.99776 7.41162C8.24646 5.71757 8.23793 2.97374 9.97866 1.26953L4.125 6.92885L7.31096 10.0103L9.99776 7.41162Z"
        fill={`url(#${a})`}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.682 9.99219L10 12.5862C10.8453 13.4033 11.3202 14.5118 11.3202 15.6677C11.3202 16.8235 10.8453 17.932 10 18.7491L15.868 13.0736L12.682 9.99219Z"
        fill={`url(#${b})`}
      />
      <defs>
        <linearGradient id={a} x1="9.52011" y1="4.79448" x2="5.05809" y2="6.74267" gradientUnits="userSpaceOnUse">
          <stop offset="0.18" stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
        <linearGradient id={b} x1="10.5111" y1="15.1734" x2="14.9651" y2="13.239" gradientUnits="userSpaceOnUse">
          <stop offset="0.18" stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
      </defs>
    </svg>
  );
};
