import { ReactNode } from 'react';

export type CommandCategory = 'navigation' | 'workflow' | 'subscriber' | 'action' | 'search' | 'settings' | 'help';

export type CommandPriority = 'high' | 'medium' | 'low';

export interface Command {
  id: string;
  label: string;
  description?: string;
  category: CommandCategory;
  keywords?: string[];
  icon?: ReactNode;
  shortcut?: string;
  priority?: CommandPriority;
  execute: () => void | Promise<void>;
  isVisible?: () => boolean;
  isEnabled?: () => boolean;
}

export interface CommandGroup {
  category: CommandCategory;
  label: string;
  commands: Command[];
}

export interface CommandPaletteState {
  isOpen: boolean;
  search: string;
  selectedIndex: number;
}

export type CommandExecutionContext = {
  currentPath: string;
  environmentSlug?: string;
  organizationId?: string;
  searchQuery?: string;
};
