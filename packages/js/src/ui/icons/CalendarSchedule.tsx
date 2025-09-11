import { JSX } from 'solid-js';

export const CalendarSchedule = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 14 14" {...props}>
      <path
        fill="currentColor"
        d="M4.381 2.952V2h.952v.952H8.19V2h.953v.952h1.905c.263 0 .476.214.476.477v2.38h-.953V3.906H9.143v.952H8.19v-.952H5.333v.952h-.952v-.952H2.952v6.666H5.81v.953H2.476A.476.476 0 0 1 2 11.048v-7.62c0-.262.213-.476.476-.476h1.905Zm4.762 4.286a1.905 1.905 0 1 0 0 3.81 1.905 1.905 0 0 0 0-3.81ZM6.286 9.143a2.857 2.857 0 1 1 5.714 0 2.857 2.857 0 0 1-5.714 0Zm2.38-1.429V9.34l1.093 1.092.673-.673-.813-.813V7.714h-.952Z"
      />
    </svg>
  );
};
