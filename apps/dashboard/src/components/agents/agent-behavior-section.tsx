import { RiExpandUpDownLine } from 'react-icons/ri';
import { HelpTooltipIndicator } from '@/components/primitives/help-tooltip-indicator';
import { Switch } from '@/components/primitives/switch';

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center px-2 py-1.5">
      <span className="text-text-soft font-code text-[11px] font-medium uppercase leading-4 tracking-wider">
        {children}
      </span>
    </div>
  );
}

function ToggleRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex flex-1 items-center gap-1">
        <span className="text-text-sub text-label-sm font-medium">{label}</span>
        <HelpTooltipIndicator text={label} size="5" />
      </div>
      {children}
    </div>
  );
}

function EmojiPickerButton({ emoji }: { emoji: string }) {
  return (
    <button
      type="button"
      className="border-stroke-soft bg-bg-white flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-[3px] shadow-xs"
    >
      <span className="text-label-sm leading-5">{emoji}</span>
      <RiExpandUpDownLine className="text-text-soft size-3" />
    </button>
  );
}

export function AgentBehaviorSection() {
  return (
    <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
      <SectionHeader>Agent behavior</SectionHeader>
      <div className="bg-bg-white flex flex-col overflow-hidden rounded-md shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
        {/*
        Interrupt mode and response timeout are not supported yet.

        <div className="border-stroke-weak flex flex-col gap-3 border-b p-3">
          <SettingRow
            label="Interrupt mode"
            description="What happens when a new message arrives while the agent is still responding."
          >
            <Select defaultValue="drop_respond">
              <SelectTrigger
                className="border-stroke-soft bg-bg-white text-text-strong text-label-sm h-8 w-full rounded-md shadow-xs"
                rightIcon={<RiExpandUpDownLine className="text-text-soft size-3" />}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="drop_respond">Drop and respond new message</SelectItem>
                <SelectItem value="queue">Queue and respond in order</SelectItem>
                <SelectItem value="ignore">Ignore new message</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow label="Response timeout">
            <div className="border-stroke-soft bg-bg-white flex h-8 w-full items-center justify-between overflow-hidden rounded-md border px-2 shadow-xs">
              <span className="text-text-strong text-label-sm font-medium">30</span>
              <span className="text-text-soft text-label-sm font-medium">seconds</span>
            </div>
          </SettingRow>
        </div>
        */}

        <div className="flex flex-col gap-2 p-3">
          <ToggleRow label={'Show "Typing..." indicator when available'}>
            <Switch defaultChecked />
          </ToggleRow>

          <ToggleRow label="React to incoming messages so users know the agent received them">
            <EmojiPickerButton emoji="👀" />
          </ToggleRow>

          <ToggleRow label="React to the final message when a conversation is resolved">
            <EmojiPickerButton emoji="✅" />
          </ToggleRow>
        </div>
      </div>
    </div>
  );
}
