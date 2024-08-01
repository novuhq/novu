import { useLocation, useNavigate } from 'react-router-dom';
import { GetStartedTabsViewsEnum } from '../../consts/GetStartedTabsViewsEnum';

export const useGetStartedTabView = () => {
  // const [params, setParams] = useSearchParams(DEFAULT_PARAMS as unknown as URLSearchParamsInit);
  const navigate = useNavigate();
  const loc = useLocation();

  // remove the leading #
  const currentView = loc.hash.slice(1) as GetStartedTabsViewsEnum | undefined;

  // remove hash if null or add the specific view
  const setView = (view: GetStartedTabsViewsEnum | null) => {
    navigate({ pathname: './', search: loc.search, hash: view === null ? undefined : view }, { replace: true });
  };

  return {
    currentView,
    setView,
  };
};
