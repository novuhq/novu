import { PermissionsEnum } from '@novu/shared';
import { RiBookMarkedLine, RiRouteFill } from 'react-icons/ri';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { VersionControlDev } from '@/components/icons/version-control-dev';
import { VersionControlProd } from '@/components/icons/version-control-prod';
import { Button } from '@/components/primitives/button';
import { PermissionButton } from '@/components/primitives/permission-button';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '../utils/routes';
import { ListNoResults } from './list-no-results';
import { LinkButton } from './primitives/button-link';

interface WorkflowListEmptyProps {
  emptySearchResults?: boolean;
  onClearFilters?: () => void;
}

export const WorkflowListEmpty = ({ emptySearchResults, onClearFilters }: WorkflowListEmptyProps) => {
  const { currentEnvironment, switchEnvironment, oppositeEnvironment } = useEnvironment();

  if (emptySearchResults) {
    return (
      <ListNoResults
        title="No workflows found"
        description="We couldn't find any workflows that match your search criteria. Try adjusting your filters or create a new workflow."
        onClearFilters={onClearFilters}
      />
    );
  }

  const isProd = currentEnvironment?.name === 'Production';

  return isProd ? (
    <WorkflowListEmptyProd switchToDev={() => switchEnvironment(oppositeEnvironment?.slug)} />
  ) : (
    <WorkflowListEmptyDev />
  );
};

const WorkflowListEmptyProd = ({ switchToDev }: { switchToDev: () => void }) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-6">
    <VersionControlProd />
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="text-foreground-900 block font-medium">No workflows in production</span>
      <p className="text-foreground-400 max-w-[60ch] text-sm">
        To sync workflows to production, switch to Development environment, select a workflow and click on 'Sync to
        Production,' or sync via novu CLI for code-first workflows.
      </p>
    </div>

    <div className="flex items-center justify-center gap-6">
      <Link to={'https://docs.novu.co/platform/concepts/workflows'} target="_blank">
        <LinkButton trailingIcon={RiBookMarkedLine}>View docs</LinkButton>
      </Link>

      <Button variant="secondary" className="gap-2" onClick={switchToDev}>
        Switch to Development
      </Button>
    </div>
  </div>
);

const WorkflowListEmptyDev = () => {
  const navigate = useNavigate();
  const { environmentSlug } = useParams();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6">
      <VersionControlDev />
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-foreground-900 block font-medium">Create your first workflow to send notifications</span>
        <p className="text-foreground-400 max-w-[60ch] text-sm">
          Workflows handle notifications across multiple channels in a single, version-controlled flow, with the ability
          to manage preference for each subscriber.
        </p>
      </div>

      <div className="flex items-center justify-center gap-6">
        <Link to={'https://docs.novu.co/platform/concepts/workflows'} target="_blank">
          <LinkButton variant="gray" trailingIcon={RiBookMarkedLine}>
            View docs
          </LinkButton>
        </Link>

        <PermissionButton
          permission={PermissionsEnum.WORKFLOW_WRITE}
          variant="primary"
          leadingIcon={RiRouteFill}
          className="gap-2"
          onClick={() => {
            navigate(buildRoute(ROUTES.WORKFLOWS_CREATE, { environmentSlug: environmentSlug || '' }));
          }}
        >
          Create workflow
        </PermissionButton>
      </div>
    </div>
  );
};
