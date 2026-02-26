/** biome-ignore-all lint/correctness/useUniqueElementIds: working correctly */

export const BroomSparkle = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 12 12" {...props}>
      <path
        fill="url(#a)"
        d="M6.914 5.416a.5.5 0 0 1-.353-.854L10.477.647a.5.5 0 1 1 .707.707L7.268 5.27a.5.5 0 0 1-.353.147z"
      />
      <path
        fill="url(#b)"
        d="M5.695 5.99a9.5 9.5 0 0 0 2.413 1.814 3.4 3.4 0 0 0 .19-1.014c.019-.864-.334-1.62-1.05-2.249-.835-.732-1.961-.88-2.967-.495A9.5 9.5 0 0 0 5.695 5.99"
      />
      <path
        fill="url(#c)"
        d="M4.97 6.68a10.4 10.4 0 0 1-1.558-2.133c-.103.083-.21.161-.305.259-.843.853-1.28 1.268-2.01 1.367a.5.5 0 0 0-.43.545c.224 2.232 1.528 3.898 3.486 4.456q.246.069.496.069c.416 0 .828-.142 1.163-.41.266-.212 1.225-1.025 1.871-2.12A10.5 10.5 0 0 1 4.97 6.68"
      />
      <path
        fill="url(#d)"
        d="m11.77 7.995-.842-.281-.28-.842c-.092-.272-.542-.272-.633 0l-.28.842-.843.28a.333.333 0 0 0 0 .633l.842.28.28.842a.334.334 0 0 0 .634 0l.28-.842.843-.28a.333.333 0 0 0 0-.632"
      />
      <path
        fill="url(#e)"
        fillOpacity=".15"
        d="m11.77 7.995-.842-.281-.28-.842c-.092-.272-.542-.272-.633 0l-.28.842-.843.28a.333.333 0 0 0 0 .633l.842.28.28.842a.334.334 0 0 0 .634 0l.28-.842.843-.28a.333.333 0 0 0 0-.632"
      />
      <path
        fill="url(#f)"
        d="m3.664 2.326-.63-.21-.211-.631c-.068-.204-.406-.204-.474 0l-.211.631-.63.21a.25.25 0 0 0 0 .475l.63.21.21.631a.25.25 0 0 0 .474 0l.21-.631.631-.21a.25.25 0 0 0 0-.475"
      />
      <path fill="url(#g)" d="M5.5 2a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1" />
      <defs>
        <linearGradient id="a" x1="11.33" x2="6.414" y1=".5" y2="5.416" gradientUnits="userSpaceOnUse">
          <stop offset=".232" stopColor="#ff884d" />
          <stop offset=".802" stopColor="#e300bd" />
        </linearGradient>
        <linearGradient id="b" x1="8.298" x2="4.334" y1="3.84" y2="7.856" gradientUnits="userSpaceOnUse">
          <stop offset=".232" stopColor="#ff884d" />
          <stop offset=".802" stopColor="#e300bd" />
        </linearGradient>
        <linearGradient id="c" x1="7.683" x2=".995" y1="4.547" y2="11.558" gradientUnits="userSpaceOnUse">
          <stop offset=".232" stopColor="#ff884d" />
          <stop offset=".802" stopColor="#e300bd" />
        </linearGradient>
        <linearGradient id="d" x1="11.999" x2="8.689" y1="6.668" y2="10.002" gradientUnits="userSpaceOnUse">
          <stop offset=".232" stopColor="#ff884d" />
          <stop offset=".802" stopColor="#e300bd" />
        </linearGradient>
        <linearGradient id="e" x1="11.999" x2="9.317" y1="8.345" y2="9.668" gradientUnits="userSpaceOnUse">
          <stop offset=".232" stopColor="#ff884d" />
          <stop offset=".802" stopColor="#e300bd" />
        </linearGradient>
        <linearGradient id="f" x1="3.835" x2="1.354" y1="1.332" y2="3.831" gradientUnits="userSpaceOnUse">
          <stop offset=".232" stopColor="#ff884d" />
          <stop offset=".802" stopColor="#e300bd" />
        </linearGradient>
        <linearGradient id="g" x1="6" x2="5" y1="1" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset=".232" stopColor="#ff884d" />
          <stop offset=".802" stopColor="#e300bd" />
        </linearGradient>
      </defs>
    </svg>
  );
};
