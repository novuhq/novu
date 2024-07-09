import React from 'react';

export function NorfolkIsland(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_194525)">
        <path
          d="M28.695 1.985A19.92 19.92 0 0019.999 0a19.92 19.92 0 00-8.695 1.985L9.564 20l1.74 18.016A19.92 19.92 0 0019.999 40a19.92 19.92 0 008.696-1.984L30.434 20l-1.74-18.015z"
          fill="#F0F0F0"
        />
        <path
          d="M11.304 1.985C4.614 5.22 0 12.071 0 20c0 7.93 4.614 14.78 11.304 18.015V1.985zM28.695 1.985v36.03C35.385 34.78 40 27.929 40 20S35.385 5.22 28.695 1.985zM25.218 26.087L20.001 9.565l-5.218 16.522h3.913v4.348h2.609v-4.348h3.913z"
          fill="#6DA544"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_194525">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
