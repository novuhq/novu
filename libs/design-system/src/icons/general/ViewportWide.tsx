import fitToScreenSvg from '../../../../../apps/web/public/static/images/fit_to_screen.svg';

export const ViewportWide = () => {

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
    >
      <image xlinkHref={fitToScreenSvg} width="100%" height="100%" /> 
    </svg>
  );
};
