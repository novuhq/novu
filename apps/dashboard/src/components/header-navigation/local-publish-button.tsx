import { useState } from 'react';
import { LuBookUp2 } from 'react-icons/lu';
import { RiTerminalBoxLine } from 'react-icons/ri';
import { ExternalLink } from '@/components/shared/external-link';
import { Button } from '../primitives/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../primitives/dialog';

const SYNCING_DOCS_URL = 'https://docs.novu.co/framework/deployment/syncing';

/**
 * In the Local environment the workflows stream live from the developer's
 * machine, so there is nothing to publish from the dashboard. The regular
 * "Publish changes" flow confuses users here, so we keep the familiar button
 * but redirect them to the syncing guide, which explains the GitOps flow:
 * deploy your bridge app and run the sync command from the CLI / CI.
 */
export const LocalPublishButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="secondary"
        className="h-[26px]"
        mode="outline"
        size="2xs"
        leadingIcon={LuBookUp2}
        onClick={() => setIsModalOpen(true)}
      >
        Publish changes
      </Button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md gap-4 p-3">
          <div className="flex items-start justify-start">
            <div className="bg-neutral-alpha-50 flex h-8 w-8 items-center justify-center rounded-[10px]">
              <RiTerminalBoxLine className="text-text-sub h-5 w-5" />
            </div>
          </div>

          <div>
            <DialogTitle className="text-label-sm text-text-strong">Publishing from the Local environment</DialogTitle>
            <DialogDescription className="text-text-soft text-paragraph-xs mt-1">
              Workflows here stream live from your machine and can't be published from the dashboard. To push them to
              Development or Production, deploy your bridge application and run the sync command from your CLI or CI
              against the deployed server.
            </DialogDescription>
          </div>

          <div className="flex items-center justify-between gap-2">
            <ExternalLink variant="documentation" href={SYNCING_DOCS_URL}>
              Read the syncing guide
            </ExternalLink>

            <Button variant="primary" size="2xs" onClick={() => setIsModalOpen(false)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
