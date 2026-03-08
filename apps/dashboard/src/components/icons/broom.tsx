export const Broom = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" className="actual" viewBox="0 0 12 12" {...props}>
      <g style={{ animation: 'rock 1.6s ease-in-out infinite', transformOrigin: '6px 6px' }}>
        <path
          fill="#99a0ae"
          d="M6.914 5.416a.5.5 0 0 1-.353-.854L10.477.647a.5.5 0 1 1 .707.707L7.268 5.27a.5.5 0 0 1-.353.147z"
        />
        <path
          fill="#99a0ae"
          d="M5.695 5.99a9.5 9.5 0 0 0 2.413 1.814 3.4 3.4 0 0 0 .19-1.014c.019-.864-.334-1.62-1.05-2.249-.835-.732-1.961-.88-2.967-.495A9.5 9.5 0 0 0 5.695 5.99M4.97 6.68a10.4 10.4 0 0 1-1.558-2.133c-.103.083-.21.161-.305.259-.843.853-1.28 1.268-2.01 1.367a.5.5 0 0 0-.43.545c.224 2.232 1.528 3.898 3.486 4.456q.246.069.496.069c.416 0 .828-.142 1.163-.41.266-.212 1.225-1.025 1.871-2.12A10.5 10.5 0 0 1 4.97 6.68"
        />
      </g>
      <path
        fill="#99a0ae"
        d="m11.77 7.995-.842-.281-.28-.842c-.092-.272-.542-.272-.633 0l-.28.842-.843.28a.333.333 0 0 0 0 .633l.842.28.28.842a.334.334 0 0 0 .634 0l.28-.842.843-.28a.333.333 0 0 0 0-.632"
        style={{
          animation: 'blink 1.6s ease-in-out infinite',
          transformOrigin: '10.33px 8.31px',
          animationDelay: '0s',
        }}
      />
      <path
        fill="#99a0ae"
        d="m3.664 2.326-.63-.21-.211-.631c-.068-.204-.406-.204-.474 0l-.211.631-.63.21a.25.25 0 0 0 0 .475l.63.21.21.631a.25.25 0 0 0 .474 0l.21-.631.631-.21a.25.25 0 0 0 0-.475"
        style={{
          animation: 'blink 1.6s ease-in-out infinite',
          transformOrigin: '2.585px 2.564px',
          animationDelay: '.35s',
        }}
      />
      <circle
        cx="5.5"
        cy="1.5"
        r=".5"
        fill="#99a0ae"
        style={{ animation: 'blink 1.6s ease-in-out infinite', transformOrigin: '5.5px 1.5px', animationDelay: '.7s' }}
      />
      <style>{`
        @keyframes rock{0%,to{transform:rotate(0deg) translateY(0)}25%{transform:rotate(1.5deg) translateY(-.3px)}75%{transform:rotate(-1deg) translateY(.1px)}}
        @keyframes blink{0%,45%,to{opacity:.2;transform:scale(.5)}20%{opacity:1;transform:scale(1.15)}}
      `}</style>
    </svg>
  );
};
