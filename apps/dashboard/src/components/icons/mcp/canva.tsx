import { useId } from 'react';

export const CanvaIcon = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  const id = useId();
  const a = `${id}-a`;
  const b = `${id}-b`;
  const c = `${id}-c`;
  const d = `${id}-d`;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" {...props}>
      <path
        d="M10 18.75C14.8325 18.75 18.75 14.8325 18.75 10C18.75 5.16751 14.8325 1.25 10 1.25C5.16751 1.25 1.25 5.16751 1.25 10C1.25 14.8325 5.16751 18.75 10 18.75Z"
        fill="#7D2AE7"
      />
      <path
        d="M10 18.75C14.8325 18.75 18.75 14.8325 18.75 10C18.75 5.16751 14.8325 1.25 10 1.25C5.16751 1.25 1.25 5.16751 1.25 10C1.25 14.8325 5.16751 18.75 10 18.75Z"
        fill={`url(#${a})`}
      />
      <path
        d="M10 18.75C14.8325 18.75 18.75 14.8325 18.75 10C18.75 5.16751 14.8325 1.25 10 1.25C5.16751 1.25 1.25 5.16751 1.25 10C1.25 14.8325 5.16751 18.75 10 18.75Z"
        fill={`url(#${b})`}
      />
      <path
        d="M10 18.75C14.8325 18.75 18.75 14.8325 18.75 10C18.75 5.16751 14.8325 1.25 10 1.25C5.16751 1.25 1.25 5.16751 1.25 10C1.25 14.8325 5.16751 18.75 10 18.75Z"
        fill={`url(#${c})`}
      />
      <path
        d="M10 18.75C14.8325 18.75 18.75 14.8325 18.75 10C18.75 5.16751 14.8325 1.25 10 1.25C5.16751 1.25 1.25 5.16751 1.25 10C1.25 14.8325 5.16751 18.75 10 18.75Z"
        fill={`url(#${d})`}
      />
      <path
        d="M13.7745 11.7934C13.7023 11.7934 13.6388 11.8544 13.5726 11.9876C12.8258 13.5019 11.536 14.5734 10.0434 14.5734C8.31752 14.5734 7.24874 13.0154 7.24874 10.8631C7.24874 7.21725 9.28011 5.1093 11.0643 5.1093C11.8981 5.1093 12.4072 5.63324 12.4072 6.46703C12.4072 7.45659 11.845 7.98054 11.845 8.32954C11.845 8.4862 11.9425 8.58106 12.1357 8.58106C12.912 8.58106 13.8232 7.68898 13.8232 6.42873C13.8232 5.20678 12.7597 4.30859 10.9755 4.30859C8.02683 4.30859 5.40625 7.04231 5.40625 10.8248C5.40625 13.7526 7.07816 15.6874 9.65784 15.6874C12.3959 15.6874 13.9791 12.9632 13.9791 12.079C13.9791 11.8832 13.879 11.7934 13.7745 11.7934Z"
        fill="white"
      />
      <defs>
        <radialGradient
          id={a}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(4.63034 16.7606) rotate(-49.416) scale(13.5348)"
        >
          <stop stopColor="#6420FF" />
          <stop offset="1" stopColor="#6420FF" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={b}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(5.88286 3.23944) rotate(54.703) scale(15.2629)"
        >
          <stop stopColor="#00C4CC" />
          <stop offset="1" stopColor="#00C4CC" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={c}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(4.63026 16.7605) rotate(-45.1954) scale(13.3709 6.14946)"
        >
          <stop stopColor="#6420FF" />
          <stop offset="1" stopColor="#6420FF" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={d}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(8.40658 3.6079) rotate(66.5198) scale(13.7777 23.0807)"
        >
          <stop stopColor="#00C4CC" stopOpacity="0.725916" />
          <stop offset="0.0001" stopColor="#00C4CC" />
          <stop offset="1" stopColor="#00C4CC" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
};
