/** biome-ignore-all lint/correctness/useUniqueElementIds: working correctly */

export const BroomSparkle = ({
  isAnimating,
  ...props
}: React.ComponentPropsWithoutRef<'svg'> & { isAnimating?: boolean }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 12 12" {...props}>
      <defs>
        <linearGradient id="a0" x1="11.33" x2="6.41" y1=".5" y2="5.42" gradientUnits="userSpaceOnUse">
          <stop offset=".23" stop-color="#ff884d" />
          <stop offset=".8" stop-color="#e300bd" />
        </linearGradient>
        <linearGradient id="a1" x1="8.3" x2="4.33" y1="3.84" y2="7.86" gradientUnits="userSpaceOnUse">
          <stop offset=".23" stop-color="#ff884d" />
          <stop offset=".8" stop-color="#e300bd" />
        </linearGradient>
        <linearGradient id="a2" x1="7.68" x2=".99" y1="4.55" y2="11.56" gradientUnits="userSpaceOnUse">
          <stop offset=".23" stop-color="#ff884d" />
          <stop offset=".8" stop-color="#e300bd" />
        </linearGradient>
        <linearGradient id="a3" x1="12" x2="8.69" y1="6.67" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset=".23" stop-color="#ff884d" />
          <stop offset=".8" stop-color="#e300bd" />
        </linearGradient>
        <linearGradient id="a4" x1="12" x2="9.32" y1="8.34" y2="9.67" gradientUnits="userSpaceOnUse">
          <stop offset=".23" stop-color="#ff884d" />
          <stop offset=".8" stop-color="#e300bd" />
        </linearGradient>
        <linearGradient id="a5" x1="3.83" x2="1.35" y1="1.33" y2="3.83" gradientUnits="userSpaceOnUse">
          <stop offset=".23" stop-color="#ff884d" />
          <stop offset=".8" stop-color="#e300bd" />
        </linearGradient>
        <linearGradient id="a6" x1="6" x2="5" y1="1" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset=".23" stop-color="#ff884d" />
          <stop offset=".8" stop-color="#e300bd" />
        </linearGradient>
      </defs>
      <g style={{ animation: isAnimating ? 'float 3.2s ease-in-out infinite' : 'none', transformOrigin: '6px 6px' }}>
        <path
          fill="url(#a0)"
          d="M6.914 5.416a.5.5 0 0 1-.353-.854L10.477.647a.5.5 0 1 1 .707.707L7.268 5.27a.5.5 0 0 1-.353.147z"
          style={{ animation: isAnimating ? 'sway 2.8s ease-in-out infinite' : 'none', transformOrigin: '11px .8px' }}
        />
        <path
          fill="url(#a1)"
          d="M5.695 5.99a9.5 9.5 0 0 0 2.413 1.814 3.4 3.4 0 0 0 .19-1.014c.019-.864-.334-1.62-1.05-2.249-.835-.732-1.961-.88-2.967-.495A9.5 9.5 0 0 0 5.695 5.99"
          style={{ animation: isAnimating ? 'wiggle 3s ease-in-out infinite' : 'none', transformOrigin: '7.5px 5px' }}
        />
        <path
          fill="url(#a2)"
          d="M4.97 6.68a10.4 10.4 0 0 1-1.558-2.133c-.103.083-.21.161-.305.259-.843.853-1.28 1.268-2.01 1.367a.5.5 0 0 0-.43.545c.224 2.232 1.528 3.898 3.486 4.456q.246.069.496.069c.416 0 .828-.142 1.163-.41.266-.212 1.225-1.025 1.871-2.12A10.5 10.5 0 0 1 4.97 6.68"
          style={{
            animation: isAnimating ? 'sweep 2.6s ease-in-out infinite' : 'none',
            transformOrigin: '6.5px 5.8px',
          }}
        />
        <path
          fill="url(#a3)"
          d="m11.77 7.995-.842-.281-.28-.842c-.092-.272-.542-.272-.633 0l-.28.842-.843.28a.333.333 0 0 0 0 .633l.842.28.28.842a.334.334 0 0 0 .634 0l.28-.842.843-.28a.333.333 0 0 0 0-.632"
          className="star-lg"
        />
        <path
          fill="url(#a4)"
          fill-opacity=".15"
          d="m11.77 7.995-.842-.281-.28-.842c-.092-.272-.542-.272-.633 0l-.28.842-.843.28a.333.333 0 0 0 0 .633l.842.28.28.842a.334.334 0 0 0 .634 0l.28-.842.843-.28a.333.333 0 0 0 0-.632"
          className="star-lg"
        />
        <path
          fill="url(#a5)"
          d="m3.664 2.326-.63-.21-.211-.631c-.068-.204-.406-.204-.474 0l-.211.631-.63.21a.25.25 0 0 0 0 .475l.63.21.21.631a.25.25 0 0 0 .474 0l.21-.631.631-.21a.25.25 0 0 0 0-.475"
          style={{
            animation: isAnimating ? 'fadeB 3s ease-in-out infinite' : 'none',
            transformOrigin: '2.585px 2.564px',
          }}
        />
        <circle
          cx="5.5"
          cy="1.5"
          r=".5"
          fill="url(#a6)"
          style={{ animation: isAnimating ? 'fadeC 2s ease-in-out infinite' : 'none', transformOrigin: '5.5px 1.5px' }}
        />
      </g>
      <style>{`@keyframes float{0%,to{transform:translateY(0)}50%{transform:translateY(-.35px)}}@keyframes sway{0%,to{transform:rotate(0deg)}35%{transform:rotate(.8deg)}70%{transform:rotate(-.5deg)}}@keyframes wiggle{0%,to{transform:rotate(0deg) translate(0,0)}40%{transform:rotate(-.6deg) translate(-.08px,.05px)}75%{transform:rotate(.4deg) translate(.04px,-.03px)}}@keyframes sweep{0%,to{transform:rotate(0deg) translate(0,0)}30%{transform:rotate(-1deg) translate(-.12px,.1px)}60%{transform:rotate(.7deg) translate(.08px,-.06px)}85%{transform:rotate(-.2deg) translate(-.03px,.02px)}}@keyframes fadeA{0%,to{opacity:1;transform:scale(1)}45%{opacity:.3;transform:scale(.85)}75%{opacity:.95;transform:scale(1.02)}}@keyframes fadeB{0%,to{opacity:.85;transform:scale(1)}50%{opacity:.2;transform:scale(.72)}}@keyframes fadeC{0%,to{opacity:.8;transform:scale(1)}35%{opacity:.1;transform:scale(.45)}65%{opacity:.75;transform:scale(1.08)}}.star-lg{animation:fadeA 2.6s ease-in-out infinite;transform-origin:10.33px 8.31px}`}</style>
    </svg>
  );
};
