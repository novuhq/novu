import type { HTMLAttributes } from 'react';

type InboxBellFilledProps = {
  bellClassName?: string;
  ringerClassName?: string;
  codeClassName?: string;
};

export function InboxBellFilled(props: HTMLAttributes<HTMLOrSVGElement> & InboxBellFilledProps) {
  const { bellClassName, codeClassName, ringerClassName, ...rest } = props;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 9 12" {...rest}>
      <g className={bellClassName}>
        <path
          fill="currentColor"
          d="M4.5.856a.642.642 0 0 0-.643.643v.386a3.216 3.216 0 0 0-2.572 3.15v.377c0 .945-.347 1.857-.974 2.564l-.149.167a.642.642 0 0 0 .48 1.07h7.715a.644.644 0 0 0 .48-1.07l-.149-.167a3.863 3.863 0 0 1-.974-2.564v-.377a3.216 3.216 0 0 0-2.572-3.15v-.386A.642.642 0 0 0 4.5.856Z"
        ></path>
        <path
          className={codeClassName}
          fill="white"
          d="M7.2 6.46 5.9272 7.7328 5.609 7.4146 6.5636 6.46 5.609 5.5054 5.9272 5.1872 7.2 6.46ZM2.4364 6.46 3.391 7.4146 3.0728 7.7328 1.8 6.46 3.0728 5.1872 3.391 5.5054 2.4364 6.46ZM4.0024 8.485H3.5236L4.9976 4.435H5.4764L4.0024 8.485Z"
        ></path>
      </g>
      <path
        className={ringerClassName}
        fill="currentColor"
        d="M5.41 10.766c.24-.24.375-.568.375-.91H3.214a1.286 1.286 0 0 0 2.196.91Z"
      ></path>
    </svg>
  );
}
