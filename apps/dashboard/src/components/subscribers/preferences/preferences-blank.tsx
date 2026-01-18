import { PermissionsEnum } from '@novu/shared';
import { IconType } from 'react-icons';
import { RiBookMarkedLine } from 'react-icons/ri';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RouteFill } from '@/components/icons';
import { PreferencesBlankIllustration } from '@/components/icons/preferences-blank-illustration';
import { PermissionButton } from '@/components/primitives/permission-button';
import { buildRoute, ROUTES } from '@/utils/routes';

export function PreferencesBlank() {
  const navigate = useNavigate();
  const { environmentSlug } = useParams();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-6">
      <div>
        <PreferencesBlankIllustration />
      </div>
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-label-md">No preferences to manage - yet!</p>
        <p className="text-paragraph-sm text-text-soft w-3/4">
          Preferences will appear as you build workflows and start sending notifications.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center gap-3">
        <PermissionButton
          permission={PermissionsEnum.WORKFLOW_WRITE}
          mode="gradient"
          variant="primary"
          leadingIcon={RouteFill as IconType}
          onClick={() => navigate(buildRoute(ROUTES.WORKFLOWS_CREATE, { environmentSlug: environmentSlug || '' }))}
        >
          Create workflow
        </PermissionButton>

        <span className="flex items-center gap-1 p-1.5">
          <RiBookMarkedLine className="size-4 text-neutral-600" />
          <Link
            className="text-label-sm text-neutral-600 underline"
            to="https://docs.novu.co/platform/concepts/preferences"
            target="_blank"
          >
            View docs
          </Link>
        </span>
      </div>
    </div>
  );
}
