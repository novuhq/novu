/** biome-ignore-all lint/correctness/useUniqueElementIds: working correctly */
import React from 'react';

export const TranslatedWorkflowIcon = (props: React.ComponentPropsWithoutRef<'svg'>) => (
  <svg width="20" height="20" viewBox="4 2.8 12 12.5" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M5.8 11.574V8.16a2.362 2.362 0 1 1 4.725 0v3.675a1.313 1.313 0 0 0 2.625 0V8.334a1.575 1.575 0 1 1 1.05 0v3.502a2.362 2.362 0 1 1-4.725 0V8.161a1.313 1.313 0 0 0-2.625 0v3.413h1.575l-2.1 2.625-2.1-2.625z"
      fill="#7D52F4"
    />
    <path
      d="M12.055 2.824v.632h2.01v1.38h-.777a6 6 0 0 1-.928 1.56q.203.145.422.268l.217.12.512-1.205.097-.228h1.166l.097.228 1.475 3.474.22.521H15.03l-.097-.228-.305-.719h-.873l-.305.719-.098.228h-1.536l.222-.521.417-.987-.283-.151a6 6 0 0 1-.827-.532 6.1 6.1 0 0 1-1.971.999l-.36.106-.106-.36-.18-.608-.105-.359.357-.107a4.7 4.7 0 0 0 1.347-.657 6 6 0 0 1-.736-1.136l-.21-.424h-.756V3.456h2.01v-.632zm-1.053 2.083q.154.266.343.512.212-.278.38-.582h-.764z"
      fill="url(#a)"
      stroke="#fff"
      strokeWidth=".75"
    />
    <defs>
      <linearGradient id="a" x1="16" y1="3.199" x2="10.071" y2="10.117" gradientUnits="userSpaceOnUse">
        <stop offset=".232" stopColor="#FF884D" />
        <stop offset=".802" stopColor="#E300BD" />
      </linearGradient>
    </defs>
  </svg>
);
