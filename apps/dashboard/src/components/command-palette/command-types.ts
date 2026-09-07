import type { StepResponseDto, WorkflowResponseDto } from '@novu/shared';
import { ReactNode } from 'react';

export type CommandCategory =
  | 'navigation'
  | 'workflow'
  | 'current-workflow'
  | 'data'
  | 'action'
  | 'search'
  | 'settings'
  | 'help';

export type CommandPriority = 'high' | 'medium' | 'low';

export interface Command {
  id: string;
  label: string;
  description?: string;
  category: CommandCategory;
  keywords?: string[];
  icon?: ReactNode;
  priority?: CommandPriority;
  metadata?: {
    slug?: string;
    workflowId?: string;
    [key: string]: unknown;
  };
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
  workflowContext?: {
    workflow?: WorkflowResponseDto;
    step?: StepResponseDto;
    isInWorkflowEditor?: boolean;
    isPending?: boolean;
  };
};
