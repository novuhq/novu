import { useCommandState } from 'cmdk';
import { useCallback, useEffect, useState } from 'react';
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiCloseLine,
  RiCornerDownLeftLine,
  RiFileLine,
  RiFlashlightLine,
  RiPlayFill,
  RiQuestionLine,
  RiRouteFill,
  RiSearch2Line,
  RiSearchLine,
  RiSettings4Line,
  RiSparklingLine,
  RiUserLine,
} from 'react-icons/ri';
import { useAiDrawer } from '@/components/ai-drawer';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { cn } from '@/utils/ui';
import { Button } from '../primitives/button';
import { Kbd } from '../primitives/kbd';
import * as CommandMenu from './command-menu';
import { CommandCategory, Command as CommandType } from './command-types';
import { useCommandPalette } from './hooks/use-command-palette';
import { useCommandRegistry } from './hooks/use-command-registry';

const CategoryIconWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div
      className={'flex size-6 items-center justify-center rounded-8 bg-bg-weak text-text-sub border border-neutral-200'}
    >
      <div className="size-3.5 flex items-center justify-center">{children}</div>
    </div>
  );
};

const getDefaultIcon = (category: CommandCategory): React.ReactNode => {
  const defaultIcons: Record<CommandCategory, React.ReactNode> = {
    'current-workflow': <RiPlayFill />,
    workflow: <RiRouteFill />,
    navigation: <RiFileLine />,
    data: <RiUserLine />,
    action: <RiFlashlightLine />,
    search: <RiSearch2Line />,
    settings: <RiSettings4Line />,
    help: <RiQuestionLine />,
  };
  return defaultIcons[category];
};

const getCategoryActionLabel = (category: CommandCategory | undefined, value: string): string => {
  const actionLabels: Record<CommandCategory, string> = {
    'current-workflow': 'Execute action',
    workflow: 'Go to workflow',
    navigation: 'Navigate to',
    data: 'Open command',
    action: 'Execute action',
    search: 'Search for',
    settings: 'Open settings',
    help: 'Get help',
  };

  if (value.includes('Ask AI')) {
    return 'Ask AI';
  } else if (!category) {
    return 'Open Command';
  }

  return actionLabels[category];
};

// Footer component that has access to command state
function CommandFooter({ commands }: { commands: CommandType[] }) {
  const selectedValue = useCommandState((state) => state.value);
  const selectedCommand = commands.find((cmd) => `${cmd.label} ${cmd.keywords?.join(' ') || ''}` === selectedValue);

  return (
    <CommandMenu.Footer className="border-t border-stroke-soft bg-bg-weak">
      <div className="flex items-center justify-between w-full py-2 pt-1.5">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            <CommandMenu.FooterKeyBox className="border-stroke-soft bg-bg-white">
              <RiArrowUpLine className="size-3 text-icon-sub" />
            </CommandMenu.FooterKeyBox>
            <CommandMenu.FooterKeyBox className="border-stroke-soft bg-bg-white">
              <RiArrowDownLine className="size-3 text-icon-sub" />
            </CommandMenu.FooterKeyBox>
          </div>
          <span className="text-paragraph-xs text-text-soft">Navigate</span>
        </div>
        <Button variant="primary" size="2xs" mode="gradient">
          <span>{getCategoryActionLabel(selectedCommand?.category, selectedValue)}</span>
          <Kbd className="border border-white/30 bg-transparent ring-transparent px-0 size-4 justify-center items-center">
            <RiCornerDownLeftLine className="size-2.5 text-white" />
          </Kbd>
        </Button>
      </div>
    </CommandMenu.Footer>
  );
}

export function CommandPalette() {
  const { isOpen, closeCommandPalette } = useCommandPalette();
  const { openAiDrawer } = useAiDrawer();
  const track = useTelemetry();
  const [search, setSearch] = useState('');
  const commandGroups = useCommandRegistry(search);

  // Create a flat list of all commands for easy lookup
  const allCommands = commandGroups.flatMap((group) => group.commands);
  const hasInkeep = !!import.meta.env.VITE_INKEEP_API_KEY;

  // Reset search when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  const openAiDrawerWithQuery = useCallback(() => {
    track(TelemetryEvent.COMMAND_PALETTE_COMMAND_SELECTED, {
      commandId: 'help-ai-search',
      commandLabel: `Ask AI "${search}"`,
      commandCategory: 'help',
    });

    openAiDrawer(search);
    closeCommandPalette();
  }, [search, openAiDrawer, closeCommandPalette, track]);

  const executeCommand = useCallback(
    async (command: CommandType) => {
      track(TelemetryEvent.COMMAND_PALETTE_COMMAND_SELECTED, {
        commandId: command.id,
        commandLabel: command.label,
        commandCategory: command.category,
      });

      closeCommandPalette();

      // Small delay to allow dialog to close smoothly
      setTimeout(async () => {
        try {
          await command.execute();
        } catch (error) {
          console.error('Error executing command:', error);
        }
      }, 100);
    },
    [closeCommandPalette, track]
  );

  return (
    <CommandMenu.Dialog open={isOpen} onOpenChange={closeCommandPalette}>
      <div className="group/cmd-input flex items-center gap-2 p-3 bg-bg-weak">
        <RiSearchLine className={cn('size-5 text-text-soft')} />
        <CommandMenu.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Type a command, search or ask Novu AI..."
          autoFocus
          className="text-label-md text-text-sub placeholder:text-text-soft"
        />
        <button
          onClick={closeCommandPalette}
          className="size-4 items-center justify-center rounded-6 text-text-soft hover:text-icon-sub transition-colors"
        >
          <RiCloseLine className="size-4" />
        </button>
      </div>

      <CommandMenu.List className="py-0 min-h-[400px]">
        {commandGroups.map((group) => (
          <CommandMenu.Group key={group.category} heading={group.label} className="px-2.5">
            {group.commands.map((command) => {
              const isEnabled = command.isEnabled ? command.isEnabled() : true;

              return (
                <CommandMenu.Item
                  key={command.id}
                  value={`${command.label} ${command.keywords?.join(' ') || ''}`}
                  onSelect={() => isEnabled && executeCommand(command)}
                  disabled={!isEnabled}
                  className="px-1.5 rounded-8"
                >
                  <div className="flex items-center gap-1.5 flex-1">
                    <CategoryIconWrapper>{command.icon || getDefaultIcon(command.category)}</CategoryIconWrapper>
                    <span className="text-text-sub text-label-sm flex-1 truncate">{command.label}</span>
                  </div>
                  {command.metadata?.workflowId && (
                    <span
                      className="text-paragraph-sm text-text-soft ml-auto max-w-32 truncate"
                      title={command.metadata.workflowId}
                    >
                      {command.metadata.workflowId}
                    </span>
                  )}
                </CommandMenu.Item>
              );
            })}
          </CommandMenu.Group>
        ))}

        {hasInkeep && search.trim() && (
          <CommandMenu.Group heading="AI Assistant" className="px-2.5">
            <CommandMenu.Item
              value={`Ask AI ${search} ai assistant help question`}
              onSelect={openAiDrawerWithQuery}
              className="px-1.5 rounded-8"
            >
              <div className="flex items-center gap-1.5 flex-1">
                <CategoryIconWrapper>
                  <RiSparklingLine />
                </CategoryIconWrapper>
                <span className="text-text-sub text-label-sm flex-1 truncate">Ask AI "{search}"</span>
              </div>
            </CommandMenu.Item>
          </CommandMenu.Group>
        )}
      </CommandMenu.List>

      <CommandFooter commands={allCommands} />
    </CommandMenu.Dialog>
  );
}
