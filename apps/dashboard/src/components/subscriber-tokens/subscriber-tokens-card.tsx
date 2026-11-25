import { IEnvironment, isSubscriberTokensRequired, PermissionsEnum } from '@novu/shared';
import { useState } from 'react';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Card, CardContent, CardHeader } from '@/components/primitives/card';
import { PermissionSwitch } from '@/components/primitives/permission-switch';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { ExternalLink } from '@/components/shared/external-link';
import { useUpdateSubscriberTokensSetting } from '@/hooks/use-update-subscriber-tokens-setting';
import { formatShortDate } from '@/utils/format-date';

const SWITCH_ID = 'require-subscriber-tokens';

export function SubscriberTokensCard({ environment }: { environment: IEnvironment }) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const updateSetting = useUpdateSubscriberTokensSetting();
  const required = isSubscriberTokensRequired(environment);
  const requiredAt = environment.subscriberTokens?.requiredAt;

  const update = async (nextRequired: boolean) => {
    try {
      await updateSetting.mutateAsync({ environment, required: nextRequired });
      showSuccessToast(
        nextRequired
          ? 'Subscribers now need a signed subscriber token'
          : 'Subscribers can connect with a subscriber hash again'
      );
      setIsConfirmOpen(false);
    } catch (error) {
      showErrorToast((error instanceof Error && error.message) || 'Failed to update the setting');
    }
  };

  const handleCheckedChange = (checked: boolean) => {
    if (checked) {
      setIsConfirmOpen(true);
    } else {
      void update(false);
    }
  };

  return (
    <>
      <Card className="w-full overflow-hidden shadow-none">
        <CardHeader>
          Signed subscriber tokens
          <p className="text-foreground-500 mt-1 text-xs font-normal">
            {'Only let subscribers in with a subscriber token your backend signs. '}
            <ExternalLink
              href="https://docs.novu.co/platform/inbox/prepare-for-production"
              className="text-foreground-500"
            >
              Learn more
            </ExternalLink>
          </p>
        </CardHeader>
        <CardContent className="rounded-b-xl border-t bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={SWITCH_ID} className="flex flex-col gap-0.5">
              <span className="text-foreground-600 text-xs font-medium">Require signed subscriber tokens</span>
              <span className="text-foreground-500 text-xs">
                {required && requiredAt
                  ? `Required since ${formatShortDate(requiredAt)} in the ${environment.name} environment.`
                  : `Subscribers in the ${environment.name} environment can still connect with a subscriber hash or no hash.`}
              </span>
            </label>
            <PermissionSwitch
              id={SWITCH_ID}
              permission={PermissionsEnum.ENVIRONMENT_WRITE}
              checked={required}
              onCheckedChange={handleCheckedChange}
              disabled={updateSetting.isPending}
            />
          </div>
        </CardContent>
      </Card>
      <ConfirmationModal
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={() => update(true)}
        title="Require signed subscriber tokens?"
        description={
          <span>
            Subscribers in the {environment.name} environment who still connect with a subscriberHash or with no hash
            lose access immediately. Only sessions opened with a signed subscriber token keep working.
          </span>
        }
        confirmButtonText="Require tokens"
        confirmButtonVariant="error"
        isLoading={updateSetting.isPending}
      />
    </>
  );
}
