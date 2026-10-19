import { type ReactNode, useCallback, useState } from 'react';
import { RiDownloadLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { CodeBlock } from '@/components/primitives/code-block';
import { ExternalLink } from '@/components/shared/external-link';
import { buildTeamsManifest } from '../../teams-app-manifest';
import { downloadTeamsAppPackage } from '../../teams-app-package';

const ADMIN_CONSENT_BASE_URL = 'https://login.microsoftonline.com/common/adminconsent';
const TEAMS_PUBLISH_DOCS_URL =
  'https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-publish-overview';

/**
 * Single, tenant-neutral MS Teams distribution flow.
 *
 * Internal ("your org") and external ("your customers") are the same per-tenant Microsoft pipeline
 * run by different admins: one multi-tenant package is uploaded, allowed in the permission policy,
 * and admin-consented in each tenant, then users connect. The customer case is therefore surfaced
 * as inline hand-off notes rather than a separate section. Validated against Microsoft Learn
 * (Publish overview, Manage custom apps, RSC consent) and Microsoft Q&A on multi-tenant bot
 * distribution: there is no "Publish" button for an admin-uploaded custom app, and skipping the
 * permission-policy step is the #1 reason users hit "This app is not available".
 */
function buildAdminConsentUrl(appId: string): string {
  const clientId = appId || '<YOUR_AZURE_APP_ID>';

  return `${ADMIN_CONSENT_BASE_URL}?client_id=${clientId}`;
}

function MsTeamsPath({ children }: { children: string }) {
  return <code className="bg-bg-weak text-text-strong rounded px-1 py-0.5 font-code text-[11px]">{children}</code>;
}

function StepItem({ index, title, children }: { index: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="bg-bg-weak text-text-sub mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium leading-none">
        {index}
      </span>
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-label-xs font-medium leading-4 text-text-strong">{title}</p>
        {children}
      </div>
    </li>
  );
}

function HandoffNote({ children }: { children: ReactNode }) {
  return (
    <div className="bg-bg-weak text-text-soft rounded-md px-2.5 py-2 text-label-xs leading-4">
      <span className="text-text-sub font-medium">Distributing to customers? </span>
      {children}
    </div>
  );
}

export function MsTeamsDistribution({ appId, agentName }: { appId?: string; agentName: string }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const resolvedAppId = appId ?? '';

  const handleDownload = useCallback(async () => {
    if (!resolvedAppId) {
      return;
    }

    setIsDownloading(true);

    try {
      const manifestJson = JSON.stringify(buildTeamsManifest(resolvedAppId, agentName), null, 2);
      await downloadTeamsAppPackage(manifestJson, agentName);
    } finally {
      setIsDownloading(false);
    }
  }, [resolvedAppId, agentName]);

  return (
    <div className="flex flex-col gap-3 pt-3">
      <ol className="flex flex-col gap-3">
        <StepItem index={1} title="Download the app package">
          <p className="text-label-xs font-normal leading-4 text-text-soft">
            One Teams app package (multi-tenant) works in every Microsoft 365 org, including yours and your customers'.
            You upload it in your own org; for customers you share this same file.
          </p>
          <div>
            <Button
              variant="secondary"
              mode="outline"
              size="xs"
              type="button"
              leadingIcon={RiDownloadLine}
              onClick={handleDownload}
              isLoading={isDownloading}
              disabled={!resolvedAppId}
            >
              Download app package
            </Button>
            {!resolvedAppId ? (
              <p className="text-text-soft text-label-xs mt-1.5 leading-4">
                The package becomes available once the Azure app credentials are saved on this integration.
              </p>
            ) : null}
          </div>
          <p className="text-text-soft text-label-xs leading-4">
            (For production) Unzip and replace <MsTeamsPath>color.png</MsTeamsPath> and{' '}
            <MsTeamsPath>outline.png</MsTeamsPath> with your icons, update the <MsTeamsPath>developer</MsTeamsPath>{' '}
            fields in <MsTeamsPath>manifest.json</MsTeamsPath>, then re-zip the three files before uploading.
          </p>
        </StepItem>

        <StepItem index={2} title="Make the app available in the tenant">
          <p className="text-label-xs font-normal leading-4 text-text-soft">
            In the <MsTeamsPath>Teams admin center → Teams apps → Manage apps</MsTeamsPath>, choose{' '}
            <strong>Actions → Upload new app</strong>, upload the package, and confirm its <strong>Status</strong> reads{' '}
            <strong>Allowed</strong>. Then, in{' '}
            <MsTeamsPath>Manage apps → Actions → Org-wide app settings → Custom apps</MsTeamsPath>, enable{' '}
            <strong>Let users install and use available apps by default</strong>.
          </p>
          <HandoffNote>
            Share the downloaded package with each customer; their Teams admin uploads it the same way in their own
            tenant (their policies must allow custom apps).
          </HandoffNote>
        </StepItem>

        <StepItem index={3} title="Allow the app in the assigned permission policy">
          <p className="text-label-xs font-normal leading-4 text-text-soft">
            In <MsTeamsPath>Teams apps → Permission policies</MsTeamsPath>, open the policy assigned to your users (the{' '}
            <strong>Global (Org-wide default)</strong> policy unless you changed it) and set{' '}
            <strong>Custom apps</strong> to <strong>Allow all apps</strong>, or allowlist this app. This is the most
            commonly missed step; without it users see “This app is not available”. Optionally pin it for everyone in{' '}
            <MsTeamsPath>Teams apps → Setup policies</MsTeamsPath>.
          </p>
        </StepItem>

        <StepItem index={4} title="Grant admin consent for the tenant">
          <p className="text-label-xs font-normal leading-4 text-text-soft">
            A Microsoft 365 Global Admin opens this link once per tenant to consent the app so the bot can install for
            that tenant's users.
          </p>
          <CodeBlock code={buildAdminConsentUrl(resolvedAppId)} language="shell" title="Admin consent link" />
          <HandoffNote>
            Your own org was consented during setup, so send this link to each customer's Global Admin. If you recently
            switched the app to multi-tenant, re-consent your own org with the same link.
          </HandoffNote>
        </StepItem>

        <StepItem index={5} title="Users connect from your app">
          <p className="text-label-xs font-normal leading-4 text-text-soft">
            Once the app is available and consented in a tenant, that tenant's users connect from your app (the{' '}
            <code className="bg-bg-weak text-text-strong rounded px-1 py-0.5 font-code text-[11px]">@novu/react</code>{' '}
            button below) and the bot installs for them automatically.
          </p>
          <HandoffNote>
            Your customers' users connect from your app in exactly the same way, with no extra steps.
          </HandoffNote>
        </StepItem>
      </ol>

      <div className="flex flex-col gap-1.5">
        <p className="text-text-soft text-label-xs leading-4">
          Changes can take a few hours (up to 24) to propagate; users then find the app under{' '}
          <strong>Built for your org</strong> in the Teams app store.
        </p>
        <div className="flex flex-col gap-0.5">
          <p className="text-text-soft text-label-xs leading-4">
            Distributing to many customers? Publish once instead of sharing the package per tenant.
          </p>
          <ExternalLink href={TEAMS_PUBLISH_DOCS_URL} variant="documentation">
            Publish to the Microsoft Teams Store
          </ExternalLink>
        </div>
      </div>
    </div>
  );
}
