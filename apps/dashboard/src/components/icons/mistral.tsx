import { useId } from 'react';

export const MistralIcon = (props: React.SVGProps<SVGSVGElement>) => {
  const clipPathId = useId();

  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" {...props}>
      <g clipPath={`url(#${clipPathId})`} opacity=".5">
        <path fill="#ffd800" d="M4.97 3.063H2.984v1.966H4.97zM12.913 3.063h-1.985v1.966h1.985z" />
        <path fill="#ffaf00" d="M6.955 5.03h-3.97v1.966h3.97zM12.912 5.03h-3.97v1.966h3.97z" />
        <path fill="#ff8205" d="M12.912 6.996H2.984v1.967h9.928z" />
        <path
          fill="#fa500f"
          d="M4.97 8.963H2.984v1.967H4.97zM8.942 8.963H6.957v1.967h1.985zM12.913 8.963h-1.985v1.967h1.985z"
        />
        <path fill="#e10500" d="M6.957 10.932H1v1.967h5.957zM14.899 10.932H8.94v1.967H14.9z" />
      </g>
      <defs>
        <clipPath id={clipPathId}>
          <path fill="#fff" d="M1 3.063h14v9.875H1z" />
        </clipPath>
      </defs>
    </svg>
  );
};
