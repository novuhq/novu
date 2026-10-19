import { RiLockLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { ROUTES } from '@/utils/routes';

const BILLING_ROLES_DOCS_URL = 'https://docs.novu.co/platform/account/roles-and-permissions#permissions-matrix';

export function BillingRestrictedState() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="bg-bg-weak text-text-soft flex size-12 items-center justify-center rounded-full">
        <RiLockLine className="size-6" />
      </div>

      <div className="flex max-w-[420px] flex-col gap-2">
        <h2 className="text-foreground-900 text-label-md">Billing is limited to organization owners</h2>
        <p className="text-text-soft text-paragraph-sm">
          Only users with the <span className="text-text-strong font-medium">Owner</span> role can view plans, change
          subscriptions, and manage payment methods. Admins, Authors, and Viewers can use the rest of the dashboard but
          cannot access billing settings.
        </p>
      </div>

      <div className="flex flex-col items-center gap-2 sm:flex-row">
        <Button variant="secondary" mode="outline" size="sm" asChild>
          <Link to={ROUTES.SETTINGS_TEAM}>Go to team settings</Link>
        </Button>
        <Button variant="secondary" mode="ghost" size="sm" asChild>
          <a href={BILLING_ROLES_DOCS_URL} target="_blank" rel="noopener noreferrer">
            View role permissions
          </a>
        </Button>
      </div>

      <p className="text-text-soft text-paragraph-xs max-w-[420px]">
        Need billing access? Ask an organization owner to update your role from{' '}
        <span className="text-text-strong">Settings → Team</span>.
      </p>
    </div>
  );
}
