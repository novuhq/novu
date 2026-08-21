import { ChatProviderIdEnum } from '@novu/shared';
import { createContext, type PropsWithChildren, useContext } from 'react';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';

type SwitchImessageProvider = (providerId: string) => void;

const ImessageProviderSwitchContext = createContext<SwitchImessageProvider | null>(null);

export function ImessageProviderSwitchProvider({
  onSwitch,
  children,
}: PropsWithChildren<{ onSwitch: SwitchImessageProvider }>) {
  return <ImessageProviderSwitchContext.Provider value={onSwitch}>{children}</ImessageProviderSwitchContext.Provider>;
}

const IMESSAGE_PROVIDER_OPTIONS = [
  { id: ChatProviderIdEnum.Sendblue as string, label: 'Sendblue' },
  { id: ChatProviderIdEnum.PhotonImessage as string, label: 'Photon' },
];

/**
 * The "Setup iMessage via" vendor picker shared by the iMessage setup guides.
 * Switching re-links the agent through the surrounding
 * ImessageProviderSwitchProvider; without one, other vendors are disabled.
 */
export function ImessageProviderSelect({ value }: { value: string }) {
  const onSwitch = useContext(ImessageProviderSwitchContext);

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-1.5">
      <span className="text-text-sub text-label-xs font-medium leading-4">iMessage provider</span>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next !== value) onSwitch?.(next);
        }}
      >
        <SelectTrigger size="2xs" className="max-w-[280px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {IMESSAGE_PROVIDER_OPTIONS.map((option) => (
            <SelectItem key={option.id} value={option.id} disabled={!onSwitch && option.id !== value}>
              <span className="flex items-center gap-2">
                <ProviderIcon providerId={option.id} providerDisplayName={option.label} className="size-4 shrink-0" />
                {option.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
