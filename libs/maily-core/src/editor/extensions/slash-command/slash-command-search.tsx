import { Editor, Range } from '@tiptap/core';
import { BlockGroupItem, BlockItem } from '@/blocks/types';

const containsText = (text: string | undefined, search: string) => text?.toLowerCase().includes(search) ?? false;

const isCommandMatch = (item: BlockItem, search: string): boolean => {
  return (
    containsText(item.title, search) ||
    containsText(item.description, search) ||
    (item.searchTerms?.some((term) => containsText(term, search)) ?? false)
  );
};

// Creates a command that navigates into a group
const createGroupNavigationCommand = (groupId: string) => {
  return ({ editor, range }: { editor: Editor; range: Range }) => {
    editor.chain().focus().insertContentAt(range, `/${groupId}.`).run();
  };
};

// Create a command-only BlockItem
const createCommandOnlyItem = (
  baseItem: Omit<BlockItem, 'command' | 'id' | 'commands'>,
  command: (options: { editor: Editor; range: Range }) => void
): BlockItem => ({
  ...baseItem,
  command,
});

// Create a navigable group item that looks like a group but acts like a command
const createNavigableGroupItem = (
  baseItem: Omit<BlockItem, 'command' | 'id' | 'commands'>,
  id: string,
  commands: BlockItem[]
): BlockItem => ({
  ...baseItem,
  command: createGroupNavigationCommand(id),
});

// Create a group-only BlockItem
const createGroupItem = (
  baseItem: Omit<BlockItem, 'command' | 'id' | 'commands'>,
  id: string,
  commands: BlockItem[]
): BlockItem => ({
  ...baseItem,
  id,
  commands,
});

const createFlattenedCommand = (parentItem: BlockItem & { id: string }, subItem: BlockItem): BlockItem => {
  const baseItem = {
    title: subItem.title,
    description: subItem.description,
    searchTerms: subItem.searchTerms || [],
    icon: subItem.icon,
    render: subItem.render,
    preview: subItem.preview,
  };

  // For subcommands that have their own command, we want to execute that directly
  if ('command' in subItem && subItem.command) {
    return createCommandOnlyItem(baseItem, subItem.command);
  }

  // For subcommands that are groups themselves, we keep the group navigation
  if ('commands' in subItem && 'id' in subItem && subItem.id && Array.isArray(subItem.commands)) {
    return createGroupItem(baseItem, subItem.id, subItem.commands);
  }

  // Fallback case - create a command that enters the parent group
  return createCommandOnlyItem(baseItem, createGroupNavigationCommand(parentItem.id));
};

const findSubCommandGroup = (
  groups: BlockGroupItem[],
  subCommandId: string
): (BlockItem & { commands: BlockItem[] }) | undefined => {
  return groups
    .flatMap((group) => group.commands)
    .find((item) => 'commands' in item && item.id?.toLowerCase() === subCommandId.toLowerCase()) as
    | (BlockItem & { commands: BlockItem[] })
    | undefined;
};

// Check if an item is a command group
const isCommandGroup = (item: BlockItem): item is BlockItem & { id: string; commands: BlockItem[] } => {
  return 'commands' in item && Array.isArray(item.commands) && !!item.id;
};

// Process a command group during search
const processGroupDuringSearch = (
  group: BlockItem & { id: string; commands: BlockItem[] },
  search: string
): BlockItem[] => {
  // If group title matches, return it as a navigable command
  if (isCommandMatch(group, search)) {
    return [createCommandOnlyItem(group, createGroupNavigationCommand(group.id))];
  }

  // Otherwise, return matching subcommands as flattened commands
  return group.commands
    .filter((subItem) => isCommandMatch(subItem, search))
    .map((subItem) => createFlattenedCommand(group, subItem));
};

const processCommand = (item: BlockItem, search: string, isSearching: boolean, editor: Editor): BlockItem[] => {
  if (item?.render?.(editor) === null) {
    return [];
  }

  if (isCommandGroup(item)) {
    if (!isSearching) {
      return [createNavigableGroupItem(item, item.id, item.commands)];
    }

    return processGroupDuringSearch(item, search);
  }

  return !isSearching || isCommandMatch(item, search) ? [item] : [];
};

export const searchSlashCommands = (query: string, editor: Editor, groups: BlockGroupItem[]): BlockGroupItem[] => {
  const search = query.toLowerCase();
  const isSearching = search.length > 0;

  // Handle subcommand navigation (e.g., "headers.")
  const subCommandMatch = search.match(/^([^.]+)\./);
  if (subCommandMatch) {
    const [, subCommandId] = subCommandMatch;
    const subCommandGroup = findSubCommandGroup(groups, subCommandId);

    if (subCommandGroup) {
      const remainingSearch = search.slice(subCommandMatch[0].length);
      const filteredCommands = subCommandGroup.commands.filter(
        (item) => !remainingSearch || isCommandMatch(item, remainingSearch)
      );

      return filteredCommands.length
        ? [
            {
              title: subCommandGroup.title,
              commands: filteredCommands,
            },
          ]
        : [];
    }
  }

  // Process all groups and filter out empty ones
  const results = groups
    .map((group) => ({
      ...group,
      commands: group.commands.flatMap((item) => processCommand(item, search, isSearching, editor)),
    }))
    .filter((group) => group.commands.length > 0);

  return results;
};
