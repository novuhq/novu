export const KeyboardIcon = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 29 28" {...props}>
      <g filter="url(#a)">
        <rect width="20" height="19" x="4.5" y="3.5" stroke="#E1E4EA" rx="5.5" shapeRendering="crispEdges" />
        <path
          fill="#99A0AE"
          d="M12.77 13.335v-.528c.474 0 .805-.1.992-.299.19-.198.286-.53.286-.997v-1.363c0-.392.037-.732.11-1.019.077-.287.2-.524.371-.711.17-.188.398-.327.682-.418.284-.09.635-.136 1.053-.136v.835c-.33 0-.59.051-.78.153a.86.86 0 0 0-.4.478c-.077.213-.116.485-.116.818v1.704c0 .222-.03.424-.09.605a.987.987 0 0 1-.319.47c-.156.13-.38.23-.669.302-.287.07-.66.106-1.12.106Zm3.494 5.438c-.418 0-.769-.046-1.053-.137a1.527 1.527 0 0 1-.682-.417 1.684 1.684 0 0 1-.37-.712 4.12 4.12 0 0 1-.111-1.018v-1.364c0-.466-.095-.798-.286-.997-.187-.199-.518-.299-.993-.299v-.528c.46 0 .834.036 1.121.107.29.07.513.171.67.302.155.13.262.287.319.469.06.182.09.383.09.605v1.705c0 .332.038.605.114.818a.86.86 0 0 0 .4.473c.191.105.451.157.78.157v.836Zm-3.495-4.944v-1.022h1.006v1.022h-1.006Z"
        />
      </g>
      <defs>
        <filter id="a" width="29" height="28" x="0" y="0" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
          <feOffset dy="1" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix values="0 0 0 0 0.054902 0 0 0 0 0.0705882 0 0 0 0 0.105882 0 0 0 0.12 0" />
          <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_11058_112160" />
          <feBlend in="SourceGraphic" in2="effect1_dropShadow_11058_112160" result="shape" />
          <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
          <feMorphology in="SourceAlpha" radius="1" result="effect2_innerShadow_11058_112160" />
          <feOffset />
          <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
          <feColorMatrix values="0 0 0 0 0.054902 0 0 0 0 0.0705882 0 0 0 0 0.105882 0 0 0 0.02 0" />
          <feBlend in2="shape" result="effect2_innerShadow_11058_112160" />
        </filter>
      </defs>
    </svg>
  );
};
