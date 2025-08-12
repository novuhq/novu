import { useCallback, useEffect, useState } from 'react';
import { RiArrowDownLine, RiArrowUpLine, RiCloseLine, RiCornerDownLeftLine, RiSearch2Line } from 'react-icons/ri';
import { cn } from '@/utils/ui';
import { IconCmd, Kbd } from '../primitives/kbd';
import * as CommandMenu from './command-menu';
import { Command as CommandType } from './command-types';
import { useCommandPalette } from './hooks/use-command-palette';
import { useCommandRegistry } from './hooks/use-command-registry';

export function CommandPalette() {
  const { isOpen, closeCommandPalette } = useCommandPalette();
  const [search, setSearch] = useState('');
  const commandGroups = useCommandRegistry(search);

  // Reset search when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

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
    <CommandMenu.Dialog open={isOpen} onOpenChange={closeCommandPalette}>
      {/* Input wrapper */}
      <div className="group/cmd-input bg-background flex h-12 w-full items-center gap-2 px-2">
        <RiSearch2Line
          className={cn(
            'text-foreground-400 size-5 shrink-0',
            'transition duration-200 ease-out',
            'group-focus-within/cmd-input:text-primary-500'
          )}
        />
        <CommandMenu.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Type a command or search..."
          autoFocus
        />
        <Kbd>
          <IconCmd className="size-2.5" /> +K
        </Kbd>
        <button
          onClick={closeCommandPalette}
          className="flex size-6 shrink-0 items-center justify-center rounded text-foreground-400 hover:text-foreground-600 transition-colors"
        >
          <RiCloseLine className="size-4" />
        </button>
      </div>

      <CommandMenu.List>
        <CommandMenu.Empty>No commands found.</CommandMenu.Empty>

        {commandGroups.map((group) => (
          <CommandMenu.Group key={group.category} heading={group.label}>
            {group.commands.map((command) => {
              const isEnabled = command.isEnabled ? command.isEnabled() : true;

              return (
                <CommandMenu.Item
                  key={command.id}
                  value={`${command.label} ${command.keywords?.join(' ') || ''}`}
                  onSelect={() => isEnabled && executeCommand(command)}
                  disabled={!isEnabled}
                >
                  <CommandMenu.ItemIcon>
                    <div className="flex size-5 shrink-0 items-center justify-center text-foreground-600">
                      {command.icon}
                    </div>
                  </CommandMenu.ItemIcon>
                  <span className="flex-1">{command.label}</span>
                  <span className="ml-auto text-xs text-foreground-400">
                    {command.category === 'action' || command.category === 'search'
                      ? 'Command'
                      : command.category === 'workflow'
                        ? 'Workflow'
                        : 'Page'}
                  </span>
                </CommandMenu.Item>
              );
            })}
          </CommandMenu.Group>
        ))}
      </CommandMenu.List>

      {/* Footer */}
      <CommandMenu.Footer>
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <CommandMenu.FooterKeyBox>
              <RiArrowUpLine className="size-4" />
            </CommandMenu.FooterKeyBox>
            <CommandMenu.FooterKeyBox>
              <RiArrowDownLine className="size-4" />
            </CommandMenu.FooterKeyBox>
            <span className="text-xs text-foreground-600">Navigate</span>
          </div>
          <div className="flex items-center gap-2">
            <CommandMenu.FooterKeyBox>
              <RiCornerDownLeftLine className="size-4" />
            </CommandMenu.FooterKeyBox>
            <span className="text-xs text-foreground-600">Select</span>
          </div>
        </div>
      </CommandMenu.Footer>
    </CommandMenu.Dialog>
  );
}
