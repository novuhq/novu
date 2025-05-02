import { JSX } from 'solid-js';

export const Unsnooze = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M4.99992 2.91634V4.99967M4.79992 5.39616L3.27392 6.46553M1.66659 1.66634L8.33325 8.33301M9.16658 4.99967C9.16658 7.30086 7.30111 9.16634 4.99992 9.16634C2.69873 9.16634 0.833252 7.30086 0.833252 4.99967C0.833252 2.69849 2.69873 0.833008 4.99992 0.833008C7.30111 0.833008 9.16658 2.69849 9.16658 4.99967Z"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};
