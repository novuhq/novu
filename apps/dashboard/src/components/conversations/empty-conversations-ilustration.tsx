import { useId } from 'react';

export const EmptyConversationsIlustration = () => {
  const uid = useId();
  const ids = {
    clipTop: `${uid}-a`,
    clipBottom: `${uid}-g`,
    b: `${uid}-b`,
    c: `${uid}-c`,
    d: `${uid}-d`,
    e: `${uid}-e`,
    f: `${uid}-f`,
    h: `${uid}-h`,
    i: `${uid}-i`,
    j: `${uid}-j`,
    k: `${uid}-k`,
    l: `${uid}-l`,
    m: `${uid}-m`,
  } as const;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="391" height="158" fill="none" viewBox="0 0 391 158">
      <rect width="204" height="54" x="81" y=".5" stroke="#f2f5f8" rx="7.5" />
      <rect width="198" height="48" x="84" y="3.5" fill="#fff" rx="4.5" />
      <rect width="198" height="48" x="84" y="3.5" stroke="#e1e4ea" rx="4.5" />
      <g clipPath={`url(#${ids.clipTop})`}>
        <rect width="12" height="12" x="92.5" y="12" fill="#e1e4ea" rx="6" />
        <rect width="12" height="12" x="92.5" y="12" fill="#f4f5f6" rx="6" />
        <path fill="#f4f5f6" d="M92.5 12h12v12h-12z" />
      </g>
      <rect width="44" height="8" x="108.5" y="14" fill={`url(#${ids.b})`} rx="2" />
      <rect width="77" height="6" x="92.5" y="28" fill={`url(#${ids.c})`} rx="3" />
      <rect width="50" height="6" x="171.5" y="28" fill={`url(#${ids.d})`} rx="3" />
      <rect width="50" height="6" x="223.5" y="28" fill={`url(#${ids.e})`} rx="3" />
      <rect width="91" height="6" x="92.5" y="37" fill={`url(#${ids.f})`} rx="3" />
      <rect width="135" height="50" x=".5" y="105.5" stroke="#f2f5f8" strokeDasharray="5 3" rx="7.5" />
      <rect width="131" height="46" x="2.5" y="107.5" fill="#fff" rx="5.5" />
      <rect width="131" height="46" x="2.5" y="107.5" stroke="#e1e4ea" rx="5.5" />
      <path
        stroke="#cacfd8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.33"
        d="M48 126.501v-2.667h-2.666m4.667 6v1.333m-8.667-.666h1.333m10.667 0h1.333m-8.666-.667v1.333m7.333 2a1.333 1.333 0 0 1-1.333 1.334h-6.115c-.354 0-.693.14-.943.39l-1.468 1.468a.47.47 0 0 1-.516.103.48.48 0 0 1-.292-.437v-8.191a1.333 1.333 0 0 1 1.334-1.333h8a1.333 1.333 0 0 1 1.333 1.333z"
      />
      <path
        fill="#cacfd8"
        fillRule="evenodd"
        d="M91.24 129.31a.36.36 0 0 1-.617.251l-4.62-4.721A6 6 0 0 1 88 124.5c1.194 0 2.305.349 3.24.949zm1.68-2.245v2.245c0 1.828-2.22 2.733-3.498 1.426l-4.968-5.077A6 6 0 0 0 82 130.5c0 1.278.4 2.462 1.08 3.435v-2.233c0-1.828 2.22-2.733 3.498-1.426l4.96 5.07A5.99 5.99 0 0 0 94 130.5c0-1.278-.4-2.462-1.08-3.435m-7.543 4.386 4.61 4.712A6 6 0 0 1 88 136.5a6 6 0 0 1-3.24-.949v-3.849a.36.36 0 0 1 .617-.251"
        clipRule="evenodd"
      />
      <path stroke="#e1e4ea" strokeLinecap="round" strokeLinejoin="bevel" strokeWidth=".75" d="M58.875 130.5h18.25" />
      <rect width="204" height="54" x="186.5" y="103.5" stroke="#f2f5f8" rx="7.5" />
      <rect width="198" height="48" x="189.5" y="106.5" fill="#fff" rx="4.5" />
      <rect width="198" height="48" x="189.5" y="106.5" stroke="#e1e4ea" rx="4.5" />
      <g clipPath={`url(#${ids.clipBottom})`}>
        <rect width="12" height="12" x="198" y="115" fill="#e1e4ea" rx="6" />
        <rect width="12" height="12" x="198" y="115" fill="#f4f5f6" rx="6" />
        <path fill="#f4f5f6" d="M198 115h12v12h-12z" />
      </g>
      <rect width="44" height="8" x="214" y="117" fill={`url(#${ids.h})`} rx="2" />
      <rect width="77" height="6" x="198" y="131" fill={`url(#${ids.i})`} rx="3" />
      <rect width="50" height="6" x="277" y="131" fill={`url(#${ids.j})`} rx="3" />
      <rect width="50" height="6" x="329" y="131" fill={`url(#${ids.k})`} rx="3" />
      <rect width="91" height="6" x="198" y="140" fill={`url(#${ids.l})`} rx="3" />
      <path
        fill="#e1e4ea"
        d="m179.375 130.875 3.317 1.54c.179.104.433-.043.433-.25v-3.33c0-.207-.254-.354-.433-.25l-3.317 1.54zm-43.375-.75h-.375v.75H136v-.75m43.75.375v-.375H136v.75h43.75z"
      />
      <path
        fill={`url(#${ids.m})`}
        d="m226.273 58.75 1.541-3.317c.103-.18-.043-.433-.25-.433h-3.331c-.207 0-.353.254-.25.433l1.54 3.317zM288.125 103v.375h.75V103h-.75m-62.227-44.625h-.375V73h.75V58.375zm8 22.625v.375H280.5v-.75h-46.602zm54.602 8h-.375v14h.75V89zm-8-8v.375A7.625 7.625 0 0 1 288.125 89h.75a8.375 8.375 0 0 0-8.375-8.375zm-54.602-8h-.375a8.375 8.375 0 0 0 8.375 8.375v-.75A7.625 7.625 0 0 1 226.273 73z"
      />
      <path
        fill="#e1e4ea"
        d="m67.625 98.375-1.54 3.317c-.104.179.043.433.25.433h3.33c.207 0 .354-.254.25-.433l-1.54-3.317zm115.75-40.5a.375.375 0 0 0-.75 0h.75M68 98.75h.375V88h-.75v10.75zM76 80v.375h99v-.75H76zm107-8h.375V57.875h-.75V72zm-8 8v.375A8.375 8.375 0 0 0 183.375 72h-.75A7.625 7.625 0 0 1 175 79.625zM68 88h.375A7.625 7.625 0 0 1 76 80.375v-.75A8.375 8.375 0 0 0 67.625 88z"
      />
      <defs>
        <linearGradient id={ids.b} x1="97.863" x2="159.511" y1="17.401" y2="17.401" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f1efef" />
          <stop offset=".48" stopColor="#f9f8f8" />
          <stop offset=".992" stopColor="#f9f8f8" stopOpacity=".75" />
        </linearGradient>
        <linearGradient id={ids.c} x1="73.885" x2="181.769" y1="30.551" y2="30.551" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f1efef" />
          <stop offset=".48" stopColor="#f9f8f8" />
          <stop offset=".992" stopColor="#f9f8f8" stopOpacity=".75" />
        </linearGradient>
        <linearGradient id={ids.d} x1="159.412" x2="229.467" y1="30.551" y2="30.551" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f1efef" />
          <stop offset=".48" stopColor="#f9f8f8" />
          <stop offset=".992" stopColor="#f9f8f8" stopOpacity=".75" />
        </linearGradient>
        <linearGradient id={ids.e} x1="211.412" x2="281.467" y1="30.551" y2="30.551" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f1efef" />
          <stop offset=".48" stopColor="#f9f8f8" />
          <stop offset=".992" stopColor="#f9f8f8" stopOpacity=".75" />
        </linearGradient>
        <linearGradient id={ids.f} x1="70.5" x2="198" y1="39.551" y2="39.551" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f1efef" />
          <stop offset=".48" stopColor="#f9f8f8" />
          <stop offset=".992" stopColor="#f9f8f8" stopOpacity=".75" />
        </linearGradient>
        <linearGradient id={ids.h} x1="203.363" x2="265.011" y1="120.401" y2="120.401" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f1efef" />
          <stop offset=".48" stopColor="#f9f8f8" />
          <stop offset=".992" stopColor="#f9f8f8" stopOpacity=".75" />
        </linearGradient>
        <linearGradient id={ids.i} x1="179.385" x2="287.269" y1="133.551" y2="133.551" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f1efef" />
          <stop offset=".48" stopColor="#f9f8f8" />
          <stop offset=".992" stopColor="#f9f8f8" stopOpacity=".75" />
        </linearGradient>
        <linearGradient id={ids.j} x1="264.912" x2="334.967" y1="133.551" y2="133.551" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f1efef" />
          <stop offset=".48" stopColor="#f9f8f8" />
          <stop offset=".992" stopColor="#f9f8f8" stopOpacity=".75" />
        </linearGradient>
        <linearGradient id={ids.k} x1="316.912" x2="386.967" y1="133.551" y2="133.551" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f1efef" />
          <stop offset=".48" stopColor="#f9f8f8" />
          <stop offset=".992" stopColor="#f9f8f8" stopOpacity=".75" />
        </linearGradient>
        <linearGradient id={ids.l} x1="176" x2="303.5" y1="142.551" y2="142.551" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f1efef" />
          <stop offset=".48" stopColor="#f9f8f8" />
          <stop offset=".992" stopColor="#f9f8f8" stopOpacity=".75" />
        </linearGradient>
        <linearGradient id={ids.m} x1="8866.45" x2="8866.45" y1="55" y2="320938" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e1e4ea" stopOpacity="0" />
          <stop offset="1" stopColor="#e1e4ea" />
        </linearGradient>
        <clipPath id={ids.clipTop}>
          <rect width="12" height="12" x="92.5" y="12" fill="#fff" rx="6" />
        </clipPath>
        <clipPath id={ids.clipBottom}>
          <rect width="12" height="12" x="198" y="115" fill="#fff" rx="6" />
        </clipPath>
      </defs>
    </svg>
  );
};
