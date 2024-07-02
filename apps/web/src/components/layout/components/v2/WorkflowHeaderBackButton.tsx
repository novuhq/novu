import { matchPath, useLocation, useNavigate, useParams } from 'react-router-dom';
import { BackButton } from '../LocalStudioHeader/BackButton';
import { ROUTES } from '../../../../constants/routes';

export const WORKFLOW_EDIT_HOME_ROUTE: ROUTES = ROUTES.WORKFLOWS_EDIT_TEMPLATEID;

function isWorkflowEditRoute(pathname: string) {
  return matchPath(WORKFLOW_EDIT_HOME_ROUTE, pathname);
}

export function WorkflowHeaderBackButton() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { templateId = '' } = useParams<{ templateId: string }>();
  const shouldHideBackButton = isWorkflowEditRoute(pathname) || !templateId;

  return <>{!shouldHideBackButton && <BackButton onClick={() => navigate(-1)} />}</>;
}
