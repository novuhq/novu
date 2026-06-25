import type { ReactNode } from 'react';

function MsTeamsPath({ children }: { children: string }) {
  return <code className="bg-bg-weak text-text-strong rounded px-1 py-0.5 font-code text-[11px]">{children}</code>;
}

type DistributionStep = {
  title: string;
  detail: ReactNode;
};

/**
 * Validated against Microsoft Learn (Manage / Publish custom apps, updated 2026): for an
 * admin-uploaded custom app there is no "Publish" button — the app is in the org catalog
 * once uploaded, and visibility is governed by org-wide settings + the assigned permission
 * policy. Skipping the permission-policy step is the #1 reason users hit
 * "This app is not available".
 */
const MSTEAMS_DISTRIBUTION_STEPS: DistributionStep[] = [
  {
    title: 'Open the app in the Teams Admin Center',
    detail: (
      <>
        Go to <MsTeamsPath>Teams apps → Manage apps</MsTeamsPath>, search for your app, and open its details page.
      </>
    ),
  },
  {
    title: 'Confirm the app status is Allowed',
    detail: (
      <>
        On the details page the <strong>Status</strong> must read <strong>Allowed</strong>. If it shows{' '}
        <strong>Blocked</strong>, select <strong>Allow</strong>.
      </>
    ),
  },
  {
    title: 'Turn on custom apps org-wide',
    detail: (
      <>
        In <MsTeamsPath>Manage apps → Actions → Org-wide app settings → Custom apps</MsTeamsPath>, enable{' '}
        <strong>Let users install and use available apps by default</strong> and{' '}
        <strong>Let users interact with custom apps in preview</strong>.
      </>
    ),
  },
  {
    title: 'Allow custom apps in the assigned permission policy',
    detail: (
      <>
        In <MsTeamsPath>Teams apps → Permission policies</MsTeamsPath>, open the policy assigned to your users (the{' '}
        <strong>Global (Org-wide default)</strong> policy unless you changed it) and set <strong>Custom apps</strong> to{' '}
        <strong>Allow all apps</strong>, or allowlist this app. This step is the most commonly missed one — without it
        users see “This app is not available”.
      </>
    ),
  },
  {
    title: 'Optional: pin the app for everyone',
    detail: (
      <>
        In <MsTeamsPath>Teams apps → Setup policies</MsTeamsPath>, add the app and assign the policy to your users so it
        is installed and pinned automatically instead of users searching for it.
      </>
    ),
  },
];

export function MsTeamsDistributionSteps() {
  return (
    <div className="pt-3">
      <ol className="flex flex-col gap-3">
        {MSTEAMS_DISTRIBUTION_STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="bg-bg-weak text-text-sub mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium leading-none">
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-label-xs font-medium leading-4 text-text-strong">{step.title}</p>
              <p className="text-label-xs font-normal leading-4 text-text-soft">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-text-soft text-label-xs mt-3 leading-4">
        Changes can take a few hours (up to 24) to propagate. Users then find the app under{' '}
        <strong>Built for your org</strong> in the Teams app store.
      </p>
    </div>
  );
}
