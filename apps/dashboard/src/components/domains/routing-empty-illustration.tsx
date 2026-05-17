import { useId } from 'react';

export function RoutingEmptyIllustration() {
  const id = useId();
  const clip0 = `${id}-clip0`;
  const paint0 = `${id}-paint0`;
  const paint1 = `${id}-paint1`;
  const paint2 = `${id}-paint2`;
  const paint3 = `${id}-paint3`;
  const paint4 = `${id}-paint4`;

  return (
    <svg width="391" height="55" viewBox="0 0 391 55" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="0.5" y="0.5" width="204" height="54" rx="7.5" stroke="#F2F5F8" />
      <rect x="3.5" y="3.5" width="198" height="48" rx="4.5" fill="white" />
      <rect x="3.5" y="3.5" width="198" height="48" rx="4.5" stroke="#E1E4EA" />
      <g clipPath={`url(#${clip0})`}>
        <rect x="12" y="12" width="12" height="12" rx="6" fill="#E1E4EA" />
        <rect x="12" y="12" width="12" height="12" rx="6" fill="#F4F5F6" />
        <rect width="12" height="12" transform="translate(12 12)" fill="#F4F5F6" />
      </g>
      <rect x="28" y="14" width="44" height="8" rx="2" fill={`url(#${paint0})`} />
      <rect x="12" y="28" width="77" height="6" rx="3" fill={`url(#${paint1})`} />
      <rect x="91" y="28" width="50" height="6" rx="3" fill={`url(#${paint2})`} />
      <rect x="143" y="28" width="50" height="6" rx="3" fill={`url(#${paint3})`} />
      <rect x="12" y="37" width="91" height="6" rx="3" fill={`url(#${paint4})`} />
      <rect x="255.5" y="2.5" width="135" height="50" rx="7.5" stroke="#F2F5F8" strokeDasharray="5 3" />
      <rect x="257.5" y="4.5" width="131" height="46" rx="5.5" fill="white" />
      <rect x="257.5" y="4.5" width="131" height="46" rx="5.5" stroke="#E1E4EA" />
      <path
        d="M303 24.8337V22.167H300.333M296.333 28.8337H297.667M308.333 28.8337H309.667M305 28.167V29.5003M301 28.167V29.5003M299 24.8337H307C307.736 24.8337 308.333 25.4306 308.333 26.167V31.5003C308.333 32.2367 307.736 32.8337 307 32.8337H299C298.264 32.8337 297.667 32.2367 297.667 31.5003V26.167C297.667 25.4306 298.264 24.8337 299 24.8337Z"
        stroke="#CACFD8"
        strokeWidth="1.33"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M346.24 26.3098C346.24 26.6323 345.849 26.792 345.623 26.5614L341.003 21.8401C341.645 21.6144 342.32 21.4994 343 21.5C344.194 21.5 345.306 21.8488 346.24 22.4491V26.3098ZM347.92 24.065V26.3098C347.92 28.1379 345.7 29.0431 344.422 27.7363L339.454 22.6591C337.966 23.7511 337 25.5129 337 27.5C337 28.7776 337.399 29.9619 338.08 30.935V28.7023C338.08 26.8741 340.3 25.9689 341.578 27.2758L346.539 32.3458C348.031 31.2545 349 29.4905 349 27.5C349 26.2224 348.601 25.0381 347.92 24.065ZM340.377 28.4506L344.988 33.1625C344.366 33.3811 343.697 33.5 343 33.5C341.807 33.5 340.694 33.1513 339.76 32.5509V28.7023C339.76 28.3798 340.152 28.22 340.377 28.4506Z"
        fill="#CACFD8"
      />
      <path
        d="M313.875 27.5H332.125"
        stroke="#E1E4EA"
        strokeWidth="0.75"
        strokeLinecap="round"
        strokeLinejoin="bevel"
      />
      <path
        d="M248.375 27.875L251.692 29.4151C251.871 29.5186 252.125 29.3722 252.125 29.1651V25.8349C252.125 25.6278 251.871 25.4814 251.692 25.5849L248.375 27.125V27.875ZM205 27.125H204.625V27.875H205V27.5V27.125ZM248.75 27.5V27.125H205V27.5V27.875H248.75V27.5Z"
        fill="#E1E4EA"
      />
      <defs>
        <linearGradient id={paint0} x1="17.3626" y1="17.4011" x2="79.011" y2="17.4011" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F1EFEF" />
          <stop offset="0.48" stopColor="#F9F8F8" />
          <stop offset="0.992158" stopColor="#F9F8F8" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id={paint1} x1="-6.61538" y1="30.5508" x2="101.269" y2="30.5508" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F1EFEF" />
          <stop offset="0.48" stopColor="#F9F8F8" />
          <stop offset="0.992158" stopColor="#F9F8F8" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id={paint2} x1="78.9121" y1="30.5508" x2="148.967" y2="30.5508" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F1EFEF" />
          <stop offset="0.48" stopColor="#F9F8F8" />
          <stop offset="0.992158" stopColor="#F9F8F8" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id={paint3} x1="130.912" y1="30.5508" x2="200.967" y2="30.5508" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F1EFEF" />
          <stop offset="0.48" stopColor="#F9F8F8" />
          <stop offset="0.992158" stopColor="#F9F8F8" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id={paint4} x1="-10" y1="39.5508" x2="117.5" y2="39.5508" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F1EFEF" />
          <stop offset="0.48" stopColor="#F9F8F8" />
          <stop offset="0.992158" stopColor="#F9F8F8" stopOpacity="0.75" />
        </linearGradient>
        <clipPath id={clip0}>
          <rect x="12" y="12" width="12" height="12" rx="6" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
