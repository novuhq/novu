import { type SVGProps } from 'react';

export function CountryFlags({
  name,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: string;
}) {
  return (
    <svg {...props}>
      <use href={`/images/country_flags.svg#${name}`} />
    </svg>
  );
}
