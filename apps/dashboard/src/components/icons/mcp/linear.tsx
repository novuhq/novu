import { useId } from 'react';

export const LinearIcon = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  const id = useId();
  const bg = `${id}-bg`;
  const a = `${id}-a`;
  const b = `${id}-b`;
  const c = `${id}-c`;
  const d = `${id}-d`;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" {...props}>
      <path
        d="M1.25 4.375C1.25 2.64911 2.64911 1.25 4.375 1.25H15.625C17.3509 1.25 18.75 2.64911 18.75 4.375V15.625C18.75 17.3509 17.3509 18.75 15.625 18.75H4.375C2.64911 18.75 1.25 17.3509 1.25 15.625V4.375Z"
        fill={`url(#${bg})`}
      />
      <path
        d="M3.90317 11.4405C3.87536 11.322 4.0166 11.2473 4.10273 11.3334L8.66678 15.8975C8.75288 15.9836 8.67823 16.1248 8.55965 16.097C6.25645 15.5567 4.44348 13.7438 3.90317 11.4405Z"
        fill={`url(#${a})`}
      />
      <path
        d="M3.75024 9.61117C3.74802 9.6466 3.76135 9.68117 3.78642 9.70624L10.2938 16.2136C10.3189 16.2387 10.3534 16.252 10.3889 16.2498C10.685 16.2314 10.9756 16.1923 11.2592 16.1341C11.3547 16.1145 11.3879 15.997 11.319 15.9281L4.07199 8.68109C4.003 8.61212 3.88559 8.64533 3.86596 8.74088C3.80773 9.02445 3.76867 9.31503 3.75024 9.61117Z"
        fill={`url(#${b})`}
      />
      <path
        d="M4.27636 7.46308C4.25556 7.50981 4.26615 7.5644 4.30231 7.60055L12.3993 15.6976C12.4355 15.7337 12.4901 15.7443 12.5368 15.7235C12.7601 15.6241 12.9765 15.512 13.185 15.388C13.254 15.347 13.2647 15.2522 13.2079 15.1954L4.80446 6.79198C4.7477 6.73522 4.65287 6.74587 4.61186 6.81488C4.48793 7.02343 4.3758 7.23981 4.27636 7.46308Z"
        fill={`url(#${c})`}
      />
      <path
        d="M5.33235 6.00926C5.28608 5.96299 5.2832 5.88877 5.3268 5.83999C6.47243 4.55742 8.13892 3.75 9.994 3.75C13.4491 3.75 16.25 6.55091 16.25 10.006C16.25 11.8611 15.4426 13.5276 14.16 14.6732C14.1112 14.7168 14.037 14.7139 13.9908 14.6677L5.33235 6.00926Z"
        fill={`url(#${d})`}
      />
      <defs>
        <linearGradient id={bg} x1="10" y1="1.25" x2="10" y2="18.75" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5C6BF1" />
          <stop offset="1" stopColor="#283188" />
        </linearGradient>
        <linearGradient id={a} x1="4.52228" y1="-12.8631" x2="21.4803" y2="11.9932" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0.65" />
        </linearGradient>
        <linearGradient id={b} x1="4.48372" y1="-2.38651" x2="15.1961" y2="13.3151" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0.65" />
        </linearGradient>
        <linearGradient id={c} x1="3.65342" y1="1.18165" x2="12.7275" y2="14.4821" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0.65" />
        </linearGradient>
        <linearGradient id={d} x1="4.19642" y1="4.91072" x2="10.7143" y2="14.4643" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0.65" />
        </linearGradient>
      </defs>
    </svg>
  );
};
