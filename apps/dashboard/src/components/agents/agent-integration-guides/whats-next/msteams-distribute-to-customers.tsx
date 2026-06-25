import { useCallback, useState } from 'react';
import { RiDownloadLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { CodeBlock } from '@/components/primitives/code-block';
import { buildTeamsManifest } from '../../teams-app-manifest';
import { downloadTeamsAppPackage } from '../../teams-app-package';

const ADMIN_CONSENT_BASE_URL = 'https://login.microsoftonline.com/common/adminconsent';

function buildAdminConsentUrl(appId: string): string {
  const clientId = appId || '<YOUR_AZURE_APP_ID>';

  return `${ADMIN_CONSENT_BASE_URL}?client_id=${clientId}`;
}

export function MsTeamsDistributeToCustomers({ appId, agentName }: { appId?: string; agentName: string }) {
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
        <li className="flex gap-3">
          <span className="bg-bg-weak text-text-sub mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium leading-none">
            1
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-label-xs font-medium leading-4 text-text-strong">Send each customer the app package</p>
            <p className="text-label-xs font-normal leading-4 text-text-soft">
              Download the Teams app package and share it with each customer. Their Teams admin uploads it under{' '}
              <strong>Teams admin center → Manage apps → Upload new app</strong> (their tenant policies must allow
              custom apps).
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
          </div>
        </li>
        <li className="flex gap-3">
          <span className="bg-bg-weak text-text-sub mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium leading-none">
            2
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-label-xs font-medium leading-4 text-text-strong">
              Each customer admin grants consent in their tenant
            </p>
            <p className="text-label-xs font-normal leading-4 text-text-soft">
              Share this link with each customer's Microsoft 365 admin. Opening it consents the app into their tenant so
              your bot can install for their users.
            </p>
            <CodeBlock code={buildAdminConsentUrl(resolvedAppId)} language="shell" title="Admin consent link" />
          </div>
        </li>
        <li className="flex gap-3">
          <span className="bg-bg-weak text-text-sub mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium leading-none">
            3
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-label-xs font-medium leading-4 text-text-strong">Customer end users connect</p>
            <p className="text-label-xs font-normal leading-4 text-text-soft">
              Once the app is installed and consented in a customer tenant, that customer's users can connect from your
              app and the bot is installed for them automatically.
            </p>
          </div>
        </li>
      </ol>
      <p className="text-text-soft text-label-xs leading-4">
        Changes can take a few hours to propagate. For self-service distribution to many customers, publish the package
        to the Microsoft Teams Store instead of sharing the ZIP per tenant.
      </p>
    </div>
  );
}
