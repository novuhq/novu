import { useCommandState } from 'cmdk';
import { useCallback, useEffect, useState } from 'react';
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiCloseLine,
  RiCornerDownLeftLine,
  RiFileLine,
  RiFlashlightLine,
  RiQuestionLine,
  RiRouteFill,
  RiSearch2Line,
  RiSearchLine,
  RiSettings4Line,
  RiSparklingLine,
  RiUserLine,
} from 'react-icons/ri';
import { cn } from '@/utils/ui';
import { Button } from '../primitives/button';
import { Kbd } from '../primitives/kbd';
import * as CommandMenu from './command-menu';
import { CommandCategory, Command as CommandType } from './command-types';
import { useCommandPalette } from './hooks/use-command-palette';
import { useCommandRegistry } from './hooks/use-command-registry';
import { InkeepSearchModal } from './inkeep-search-modal';

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
    workflow: <RiRouteFill />,
    navigation: <RiFileLine />,
    subscriber: <RiUserLine />,
    action: <RiFlashlightLine />,
    search: <RiSearch2Line />,
    settings: <RiSettings4Line />,
    help: <RiQuestionLine />,
  };
  return defaultIcons[category];
};

const getCategoryActionLabel = (category: CommandCategory): string => {
  const actionLabels: Record<CommandCategory, string> = {
    workflow: 'Go to workflow',
    navigation: 'Navigate to',
    subscriber: 'View subscriber',
    action: 'Execute action',
    search: 'Search for',
    settings: 'Open settings',
    help: 'Get help',
  };
  return actionLabels[category];
};

// Footer component that has access to command state
function CommandFooter({ commands }: { commands: CommandType[] }) {
  const selectedValue = useCommandState((state) => state.value);

  // Find the selected command based on the current value
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
          <span>{selectedCommand ? getCategoryActionLabel(selectedCommand.category) : 'Go to workflow'}</span>
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
  const [search, setSearch] = useState('');
  const [isInkeepOpen, setIsInkeepOpen] = useState(false);
  const [inkeepQuery, setInkeepQuery] = useState('');
  const commandGroups = useCommandRegistry(search);

  // Create a flat list of all commands for easy lookup
  const allCommands = commandGroups.flatMap((group) => group.commands);
  const hasInkeep = !!import.meta.env.VITE_INKEEP_API_KEY;

  // Check if there are any visible results after cmdk's filtering
  // When searching, cmdk filters items internally, so we need to check if any would match
  const hasResults = search.trim()
    ? allCommands.some((cmd) => {
        const searchLower = search.toLowerCase();
        const labelMatch = cmd.label.toLowerCase().includes(searchLower);
        const keywordMatch = cmd.keywords?.some((k) => k.toLowerCase().includes(searchLower));
        return labelMatch || keywordMatch;
      })
    : commandGroups.some((group) => group.commands.length > 0);

  // Reset search when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  // Listen for Inkeep modal open event
  useEffect(() => {
    const handleOpenInkeep = (event?: CustomEvent) => {
      const query = event?.detail?.query || '';
      setInkeepQuery(query);
      setIsInkeepOpen(true);
      closeCommandPalette(); // Close command palette when opening Inkeep
    };

    window.addEventListener('open-inkeep-search', handleOpenInkeep as EventListener);

    return () => {
      window.removeEventListener('open-inkeep-search', handleOpenInkeep as EventListener);
    };
  }, [closeCommandPalette]);

  const openInkeepWithQuery = useCallback(() => {
    setInkeepQuery(search);
    setIsInkeepOpen(true);
    closeCommandPalette();
  }, [search, closeCommandPalette]);

  const executeCommand = useCallback(
    async (command: CommandType) => {
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
    [closeCommandPalette]
  );

  return (
    <>
      <CommandMenu.Dialog open={isOpen} onOpenChange={closeCommandPalette}>
        {/* Input wrapper */}
        <div className="group/cmd-input flex items-center gap-2 p-3 bg-bg-weak">
          <RiSearchLine className={cn('size-5 text-text-soft')} />
          <CommandMenu.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Type a command or search..."
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
          <CommandMenu.Empty>
            {!hasResults && search.trim() ? (
              hasInkeep ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="size-12 rounded-full bg-gradient-to-br from-[#DD2476] to-[#FF512F] flex items-center justify-center mb-4">
                    <RiSparklingLine className="size-6 text-white" />
                  </div>
                  <p className="text-sm text-foreground-600 mb-1">No commands found for "{search}"</p>
                  <p className="text-xs text-foreground-400 mb-4">Try asking our AI assistant instead</p>
                  <Button variant="primary" size="xs" onClick={openInkeepWithQuery} className="gap-1.5">
                    <RiSparklingLine className="size-3.5" />
                    Ask Novu AI
                  </Button>
                </div>
              ) : (
                <div className="py-12 px-6 text-center">
                  <p className="text-sm text-foreground-400">No commands found for "{search}"</p>
                </div>
              )
            ) : (
              !hasResults && (
                <div className="py-12 px-6 text-center">
                  <p className="text-sm text-foreground-400">No commands found</p>
                </div>
              )
            )}
          </CommandMenu.Empty>

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
        </CommandMenu.List>

        {/* Footer */}
        <CommandFooter commands={allCommands} />
      </CommandMenu.Dialog>

      {import.meta.env.VITE_INKEEP_API_KEY && (
        <InkeepSearchModal
          isOpen={isInkeepOpen}
          onClose={() => {
            setIsInkeepOpen(false);
            setInkeepQuery('');
          }}
          apiKey={import.meta.env.VITE_INKEEP_API_KEY}
          initialQuery={inkeepQuery}
        />
      )}
    </>
  );
}
