import { RiAlertLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/primitives/dialog';

type AgentRuntimeDriftModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecreate: () => void;
  onUnlink: () => void;
  isRecreating?: boolean;
  isUnlinking?: boolean;
};

export function AgentRuntimeDriftModal({
  open,
  onOpenChange,
  onRecreate,
  onUnlink,
  isRecreating,
  isUnlinking,
}: AgentRuntimeDriftModalProps) {
  const isBusy = isRecreating || isUnlinking;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <RiAlertLine className="text-warning-500 size-5" />
            <DialogTitle>Agent not found on Anthropic</DialogTitle>
          </div>
          <DialogDescription>
            This agent no longer exists on Anthropic. It may have been deleted upstream. Choose how to proceed:
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-2">
          <div className="border-stroke-soft rounded-lg border p-3">
            <p className="text-text-strong text-label-sm font-semibold">Recreate</p>
            <p className="text-text-soft text-label-xs mt-0.5">
              Provision a new agent on Anthropic using the same name and integration. Your current model, system prompt,
              MCP servers, and tools will need to be reconfigured.
            </p>
          </div>
          <div className="border-stroke-soft rounded-lg border p-3">
            <p className="text-text-strong text-label-sm font-semibold">Unlink</p>
            <p className="text-text-soft text-label-xs mt-0.5">
              Keep the Novu agent but remove the managed-runtime link. The agent will revert to self-hosted mode and
              will no longer call Anthropic.
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" mode="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={isBusy}>
            Cancel
          </Button>
          <Button variant="secondary" size="sm" onClick={onUnlink} disabled={isBusy} isLoading={isUnlinking}>
            Unlink
          </Button>
          <Button variant="primary" size="sm" onClick={onRecreate} disabled={isBusy} isLoading={isRecreating}>
            Recreate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
