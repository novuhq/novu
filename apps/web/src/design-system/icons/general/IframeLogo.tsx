export const IframeLogo = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" {...props}>
      <g clipPath="url(#a)">
        <path
          fill="#828299"
          // eslint-disable-next-line max-len
          d="M14.731 2.244a1.201 1.201 0 0 0-1.485.825l-4.8 16.802a1.201 1.201 0 1 0 2.31.66l4.8-16.802a1.201 1.201 0 0 0-.825-1.485Zm3.023 4.504a1.202 1.202 0 0 0 0 1.7l3.349 3.352-3.353 3.353a1.202 1.202 0 0 0 1.7 1.699l4.2-4.2a1.202 1.202 0 0 0 0-1.7l-4.2-4.2a1.202 1.202 0 0 0-1.7 0l.004-.004Zm-11.502 0a1.202 1.202 0 0 0-1.7 0l-4.2 4.2a1.202 1.202 0 0 0 0 1.7l4.2 4.2a1.202 1.202 0 0 0 1.7-1.699L2.899 11.8l3.353-3.353a1.202 1.202 0 0 0 0-1.699Z"
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
