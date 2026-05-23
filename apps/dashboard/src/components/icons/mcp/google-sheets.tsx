import { useId } from 'react';

export const GoogleSheetsIcon = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  const id = useId();
  const mask = `${id}-mask`;
  const grad = `${id}-grad`;
  const radial = `${id}-radial`;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" {...props}>
      <mask id={mask} maskUnits="userSpaceOnUse" x="4" y="2" width="12" height="16" style={{ maskType: 'luminance' }}>
        <path
          d="M11.4524 2H5.2706C4.6706 2 4.17969 2.49091 4.17969 3.09091V16.9091C4.17969 17.5091 4.6706 18 5.2706 18H14.7251C15.3251 18 15.8161 17.5091 15.8161 16.9091V6.36364L11.4524 2Z"
          fill="white"
        />
      </mask>
      <g mask={`url(#${mask})`}>
        <path
          d="M11.4524 2H5.2706C4.6706 2 4.17969 2.49091 4.17969 3.09091V16.9091C4.17969 17.5091 4.6706 18 5.2706 18H14.7251C15.3251 18 15.8161 17.5091 15.8161 16.9091V6.36364L13.2706 4.54545L11.4524 2Z"
          fill="#0F9D58"
        />
        <path
          d="M7.08594 9.81641V15.0891H12.9041V9.81641H7.08594ZM9.63139 14.3619H7.81321V13.4528H9.63139V14.3619ZM9.63139 12.9073H7.81321V11.9982H9.63139V12.9073ZM9.63139 11.4528H7.81321V10.5437H9.63139V11.4528ZM12.1768 14.3619H10.3587V13.4528H12.1768V14.3619ZM12.1768 12.9073H10.3587V11.9982H12.1768V12.9073ZM12.1768 11.4528H10.3587V10.5437H12.1768V11.4528Z"
          fill="#F1F1F1"
        />
        <path d="M11.7734 6.04297L15.818 10.0866V6.36206L11.7734 6.04297Z" fill={`url(#${grad})`} />
        <path d="M11.4531 2V5.27273C11.4531 5.87545 11.9413 6.36364 12.544 6.36364H15.8168L11.4531 2Z" fill="#87CEAC" />
        <path
          d="M5.2706 2C4.6706 2 4.17969 2.49091 4.17969 3.09091V3.18182C4.17969 2.58182 4.6706 2.09091 5.2706 2.09091H11.4524V2H5.2706Z"
          fill="white"
          fillOpacity="0.2"
        />
        <path
          d="M14.7251 17.9151H5.2706C4.6706 17.9151 4.17969 17.4242 4.17969 16.8242V16.9151C4.17969 17.5151 4.6706 18.006 5.2706 18.006H14.7251C15.3251 18.006 15.8161 17.5151 15.8161 16.9151V16.8242C15.8161 17.4242 15.3251 17.9151 14.7251 17.9151Z"
          fill="#263238"
          fillOpacity="0.2"
        />
        <path
          d="M12.544 6.36435C11.9413 6.36435 11.4531 5.87616 11.4531 5.27344V5.36435C11.4531 5.96707 11.9413 6.45526 12.544 6.45526H15.8168V6.36435H12.544Z"
          fill="#263238"
          fillOpacity="0.1"
        />
      </g>
      <path
        d="M11.4524 2H5.2706C4.6706 2 4.17969 2.49091 4.17969 3.09091V16.9091C4.17969 17.5091 4.6706 18 5.2706 18H14.7251C15.3251 18 15.8161 17.5091 15.8161 16.9091V6.36364L11.4524 2Z"
        fill={`url(#${radial})`}
      />
      <defs>
        <linearGradient id={grad} x1="13.7959" y1="6.39016" x2="13.7959" y2="10.0872" gradientUnits="userSpaceOnUse">
          <stop stopColor="#263238" stopOpacity="0.2" />
          <stop offset="1" stopColor="#263238" stopOpacity="0.02" />
        </linearGradient>
        <radialGradient
          id={radial}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(4.54833 2.31803) scale(18.7635 18.7635)"
        >
          <stop stopColor="white" stopOpacity="0.1" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
};
