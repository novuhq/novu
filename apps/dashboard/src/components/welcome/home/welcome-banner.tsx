import { SVGProps, useId } from 'react';
import type { IconType } from 'react-icons';
import { RiArrowRightSLine, RiArrowRightUpLine } from 'react-icons/ri';
import { Button } from '../../primitives/button';

export type WelcomeBannerProps = {
  badgeLabel: string;
  badgeIcon: IconType;
  /** Tailwind text color class for the badge (controls icon + label tint). */
  badgeColorClassName: string;
  /** Tailwind background tint class for the badge pill. */
  badgeBackgroundClassName: string;
  title: string;
  description: string;
  ctaLabel: string;
  onCtaClick: () => void;
  learnMore?: { onClick: () => void };
};

const BackgroundSvg = (props: SVGProps<SVGSVGElement>) => {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 790 116" preserveAspectRatio="none" {...props}>
      <g filter={`url(#${id('a')})`} opacity=".4">
        <g clipPath={`url(#${id('b')})`}>
          <path fill="#fff" d="M0-50h790v170H0z" />
          <g filter={`url(#${id('c')})`} opacity=".1">
            <ellipse
              cx="159.754"
              cy="67.234"
              fill="#ffba33"
              rx="159.754"
              ry="67.234"
              transform="matrix(.96907 .2468 -.6364 .77136 182.556 44.563)"
            />
          </g>
          <g filter={`url(#${id('d')})`} opacity=".1">
            <ellipse
              cx="292.491"
              cy="100.85"
              fill="#ff006a"
              rx="292.491"
              ry="100.85"
              transform="matrix(.96907 .2468 -.6364 .77136 224.028 -66.844)"
            />
          </g>
          <g filter={`url(#${id('e')})`} opacity=".1">
            <ellipse
              cx="286.618"
              cy="117.249"
              fill="#e300bd"
              rx="286.618"
              ry="117.249"
              transform="matrix(.96907 .2468 -.6364 .77136 357.87 -148.062)"
            />
          </g>
          <path fill={`url(#${id('f')})`} d="M0-31h811v275H0z" />
        </g>
      </g>
      <defs>
        <filter
          id={id('a')}
          width="804"
          height="184"
          x="-7"
          y="-57"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur result="effect1_foregroundBlur_8136_186653" stdDeviation="3.5" />
        </filter>
        <filter
          id={id('c')}
          width="376.474"
          height="185.457"
          x="106.344"
          y="43.123"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur result="effect1_foregroundBlur_8136_186653" stdDeviation="13.79" />
        </filter>
        <filter
          id={id('d')}
          width="636.524"
          height="267.418"
          x="125.028"
          y="-50.572"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur result="effect1_foregroundBlur_8136_186653" stdDeviation="13.79" />
        </filter>
        <filter
          id={id('e')}
          width="630.503"
          height="284.816"
          x="245.753"
          y="-129.291"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur result="effect1_foregroundBlur_8136_186653" stdDeviation="13.79" />
        </filter>
        <linearGradient id={id('f')} x1="405.5" x2="405.5" y1="-31" y2="244" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fafafa" />
          <stop offset=".5" stopColor="#fafafa" stopOpacity="0" />
        </linearGradient>
        <clipPath id={id('b')}>
          <path fill="#fff" d="M0-50h790v170H0z" />
        </clipPath>
      </defs>
    </svg>
  );
};
const BackgroundMastSvg = (props: SVGProps<SVGSVGElement>) => {
  const uid = useId();
  const maskId = `${uid}-mask`;
  const gradientId = `${uid}-gradient`;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 283 116" {...props}>
      <mask id={maskId} width="283" height="153" x="0" y="-16" maskUnits="userSpaceOnUse" style={{ maskType: 'alpha' }}>
        <path fill={`url(#${gradientId})`} d="M0 137h153v283H0z" transform="rotate(-90 0 137)" />
      </mask>
      <g mask={`url(#${maskId})`}>
        <path
          stroke="#b2adbe"
          strokeWidth=".3"
          d="M6 132v-21h21v21zM6 111V90h21v21zM6 90V69h21v21zM6 69V48h21v21zM6 48V27h21v21zM6 27V6h21v21zM-15 132v-21H6v21zM-15 111V90H6v21zM-15 90V69H6v21zM-15 69V48H6v21zM-15 48V27H6v21zM-15 27V6H6v21zM-15 6v-21H6V6zM48 132v-21h21v21zM48 111V90h21v21zM48 90V69h21v21zM48 69V48h21v21zM48 48V27h21v21zM48 27V6h21v21zM48 6v-21h21V6zM27 132v-21h21v21zM27 111V90h21v21zM27 90V69h21v21zM27 48V27h21v21z"
        />
        <path fill="#ff30b7" fillOpacity=".2" stroke="#e300bd" strokeWidth=".3" d="M27 69V48h21v21z" />
        <path stroke="#b2adbe" strokeWidth=".3" d="M27 27V6h21v21zM27 6v-21h21V6z" />
        <path fill="#ffb661" fillOpacity=".2" stroke="#ffba33" strokeWidth=".3" d="M6 6v-21h21V6z" />
        <path
          stroke="#b2adbe"
          strokeWidth=".3"
          d="M69 132v-21h21v21zM69 111V90h21v21zM69 90V69h21v21zM69 69V48h21v21zM69 48V27h21v21zM69 27V6h21v21zM69 6v-21h21V6zM90 132v-21h21v21zM90 111V90h21v21zM90 90V69h21v21zM90 69V48h21v21zM90 48V27h21v21zM90 27V6h21v21zM90 6v-21h21V6zM111 132v-21h21v21zM111 111V90h21v21zM111 90V69h21v21zM111 69V48h21v21zM111 48V27h21v21zM111 27V6h21v21zM111 6v-21h21V6zM132 132v-21h21v21zM132 111V90h21v21zM132 90V69h21v21zM132 69V48h21v21zM132 48V27h21v21zM132 6v-21h21V6zM153 132v-21h21v21zM153 111V90h21v21zM153 90V69h21v21zM153 69V48h21v21zM153 48V27h21v21zM153 27V6h21v21zM153 6v-21h21V6zM174 132v-21h21v21zM174 111V90h21v21zM174 90V69h21v21zM174 69V48h21v21zM174 48V27h21v21zM174 27V6h21v21zM174 6v-21h21V6z"
        />
        <path fill="#ff006a" fillOpacity=".2" stroke="#ff006a" strokeWidth=".3" d="M132 27V6h21v21z" />
        <circle cx="90.001" cy="48" r="1" fill="#6b6382" transform="rotate(-90 90 48)" />
      </g>
      <defs>
        <radialGradient
          id={gradientId}
          cx="0"
          cy="0"
          r="1"
          gradientTransform="matrix(0 141.5 -76.5 0 76.5 278.5)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#d9d9d9" stopOpacity=".4" />
          <stop offset="1" stopColor="#d9d9d9" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export function WelcomeBanner({
  badgeLabel,
  badgeIcon: BadgeIcon,
  badgeColorClassName,
  badgeBackgroundClassName,
  title,
  description,
  ctaLabel,
  onCtaClick,
  learnMore,
}: WelcomeBannerProps) {
  return (
    <div className="border-stroke-soft relative isolate overflow-hidden rounded-[10px] border p-4">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <BackgroundSvg className="absolute inset-0 size-full" />
        <BackgroundMastSvg
          className="absolute inset-y-0 left-1/3 -translate-x-1/3 h-full w-auto"
          preserveAspectRatio="xMinYMid meet"
        />
      </div>

      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1 rounded-[4px] py-0.5 pl-[3px] pr-[5px] ${badgeBackgroundClassName} ${badgeColorClassName}`}
        >
          <BadgeIcon className="size-3.5" aria-hidden />
          <span className="font-code text-code-xs font-medium uppercase leading-4 tracking-wider">{badgeLabel}</span>
        </span>

        <Button variant="secondary" mode="outline" size="2xs" trailingIcon={RiArrowRightSLine} onClick={onCtaClick}>
          {ctaLabel}
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <p className="text-text-strong text-label-sm font-medium leading-5">{title}</p>
        <p className="text-text-soft text-paragraph-xs leading-4">
          {description}
          {learnMore ? (
            <>
              {' '}
              <button
                type="button"
                onClick={learnMore.onClick}
                className="text-text-sub hover:text-text-strong inline-flex cursor-pointer items-center gap-0.5 font-medium transition-colors"
              >
                Learn more
                <RiArrowRightUpLine className="size-3.5" aria-hidden />
              </button>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
