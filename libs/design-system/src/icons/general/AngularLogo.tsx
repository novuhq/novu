export const AngularLogo = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" {...props}>
      <g clipPath="url(#a)">
        <path fill="#BEBECC" d="M11.964.03.75 3.995l1.772 14.76 9.454 5.22 9.503-5.291 1.771-14.76L11.964.03Z" />
        <path fill="#AD2433" d="M22.131 4.778 11.937 1.286v21.441l8.543-4.75 1.651-13.2Z" />
        <path fill="#C52A37" d="m2.009 4.84 1.518 13.2 8.411 4.687V1.285L2.008 4.84Z" />
        <path
          fill="#fff"
          // eslint-disable-next-line max-len
          d="m14.744 12.7-2.806 1.318H8.981l-1.39 3.494-2.586.048 6.933-15.496L14.744 12.7Zm-.271-.663-2.516-5.004-2.064 4.917h2.045l2.535.087Z"
        />
        <path
          fill="#BEBECC"
          d="m11.938 2.064.018 4.968 2.342 4.922h-2.355l-.005 2.06 3.256.004 1.522 3.542 2.474.046-7.253-15.542Z"
        />
      </g>
      <defs>
        <clipPath id="a">
          <path fill="#fff" d="M0 0h24v24H0z" />
        </clipPath>
      </defs>
    </svg>
  );
};
