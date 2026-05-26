import { useId } from 'react';

export const SupabaseIcon = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  const id = useId();
  const grad1 = `${id}-grad1`;
  const grad2 = `${id}-grad2`;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" {...props}>
      <path
        d="M11.2341 17.2502C10.8509 17.7328 10.0739 17.4684 10.0647 16.8522L9.92969 7.83984H15.9896C17.0872 7.83984 17.6993 9.10759 17.0168 9.96721L11.2341 17.2502Z"
        fill={`url(#${grad1})`}
      />
      <path
        d="M11.2341 17.2502C10.8509 17.7328 10.0739 17.4684 10.0647 16.8522L9.92969 7.83984H15.9896C17.0872 7.83984 17.6993 9.10759 17.0168 9.96721L11.2341 17.2502Z"
        fill={`url(#${grad2})`}
        fillOpacity="0.2"
      />
      <path
        d="M8.77275 2.74924C9.15595 2.26661 9.93294 2.53106 9.94217 3.14724L10.0013 12.1596H4.01729C2.91965 12.1596 2.30747 10.8918 2.99002 10.0322L8.77275 2.74924Z"
        fill="#3ECF8E"
      />
      <defs>
        <linearGradient id={grad1} x1="9.92969" y1="9.83811" x2="15.3155" y2="12.0969" gradientUnits="userSpaceOnUse">
          <stop stopColor="#249361" />
          <stop offset="1" stopColor="#3ECF8E" />
        </linearGradient>
        <linearGradient id={grad2} x1="7.5419" y1="6.5688" x2="9.99811" y2="11.1925" gradientUnits="userSpaceOnUse">
          <stop />
          <stop offset="1" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};
