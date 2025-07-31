import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { cva } from 'class-variance-authority';
import { ChevronRight } from 'lucide-react';
import React from 'react';
import { cn } from '@/utils/ui';

const treeVariants = cva(
  'group hover:bg-neutral-alpha-50 flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors'
);

const selectedTreeVariants = cva('bg-neutral-alpha-100 text-text-strong');

const dragOverVariants = cva('bg-primary/20 text-primary-foreground');

interface TreeDataItem {
  id: string;
  name: string;
  icon?: any;
  selectedIcon?: any;
  openIcon?: any;
  children?: TreeDataItem[];
  actions?: React.ReactNode;
  onClick?: () => void;
  draggable?: boolean;
  droppable?: boolean;
  disabled?: boolean;
}

type TreeProps = React.HTMLAttributes<HTMLDivElement> & {
  data: TreeDataItem[] | TreeDataItem;
  initialSelectedItemId?: string;
  onSelectChange?: (item: TreeDataItem | undefined) => void;
  expandAll?: boolean;
  defaultNodeIcon?: any;
  defaultLeafIcon?: any;
  onDocumentDrag?: (sourceItem: TreeDataItem, targetItem: TreeDataItem) => void;
};

const TreeView = React.forwardRef<HTMLDivElement, TreeProps>(
  (
    {
      data,
      initialSelectedItemId,
      onSelectChange,
      expandAll,
      defaultLeafIcon,
      defaultNodeIcon,
      className,
      onDocumentDrag,
      ...props
    },
    ref
  ) => {
    const [selectedItemId, setSelectedItemId] = React.useState<string | undefined>(initialSelectedItemId);

    const [draggedItem, setDraggedItem] = React.useState<TreeDataItem | null>(null);

    const handleSelectChange = React.useCallback(
      (item: TreeDataItem | undefined) => {
        setSelectedItemId(item?.id);

        if (onSelectChange) {
          onSelectChange(item);
        }
      },
      [onSelectChange]
    );

    const handleDragStart = React.useCallback((item: TreeDataItem) => {
      setDraggedItem(item);
    }, []);

    const handleDrop = React.useCallback(
      (targetItem: TreeDataItem) => {
        if (draggedItem && onDocumentDrag && draggedItem.id !== targetItem.id) {
          onDocumentDrag(draggedItem, targetItem);
        }

        setDraggedItem(null);
      },
      [draggedItem, onDocumentDrag]
    );

    const expandedItemIds = React.useMemo(() => {
      if (!initialSelectedItemId) {
        return [] as string[];
      }

      const ids: string[] = [];

      function walkTreeItems(items: TreeDataItem[] | TreeDataItem, targetId: string) {
        if (items instanceof Array) {
          for (let i = 0; i < items.length; i++) {
            ids.push(items[i]!.id);

            if (walkTreeItems(items[i]!, targetId) && !expandAll) {
              return true;
            }

            if (!expandAll) ids.pop();
          }
        } else if (!expandAll && items.id === targetId) {
          return true;
        } else if (items.children) {
          return walkTreeItems(items.children, targetId);
        }
      }

      walkTreeItems(data, initialSelectedItemId);
      return ids;
    }, [data, expandAll, initialSelectedItemId]);

    return (
      <div className={cn('relative overflow-hidden p-2', className)}>
        <TreeItem
          data={data}
          ref={ref}
          selectedItemId={selectedItemId}
          handleSelectChange={handleSelectChange}
          expandedItemIds={expandedItemIds}
          defaultLeafIcon={defaultLeafIcon}
          defaultNodeIcon={defaultNodeIcon}
          handleDragStart={handleDragStart}
          handleDrop={handleDrop}
          draggedItem={draggedItem}
          {...props}
        />
        <div
          className="h-[48px] w-full"
          onDrop={(e) => {
            handleDrop({ id: '', name: 'parent_div' });
          }}
        ></div>
      </div>
    );
  }
);
TreeView.displayName = 'TreeView';

type TreeItemProps = TreeProps & {
  selectedItemId?: string;
  handleSelectChange: (item: TreeDataItem | undefined) => void;
  expandedItemIds: string[];
  defaultNodeIcon?: any;
  defaultLeafIcon?: any;
  handleDragStart?: (item: TreeDataItem) => void;
  handleDrop?: (item: TreeDataItem) => void;
  draggedItem: TreeDataItem | null;
};

const TreeItem = React.forwardRef<HTMLDivElement, TreeItemProps>(
  (
    {
      className,
      data,
      selectedItemId,
      handleSelectChange,
      expandedItemIds,
      defaultNodeIcon,
      defaultLeafIcon,
      handleDragStart,
      handleDrop,
      draggedItem,
      ...props
    },
    ref
  ) => {
    if (!(data instanceof Array)) {
      data = [data];
    }

    return (
      <div ref={ref} role="tree" className={className} {...props}>
        <ul>
          {data.map((item) => (
            <li key={item.id}>
              {item.children ? (
                <TreeNode
                  item={item}
                  selectedItemId={selectedItemId}
                  expandedItemIds={expandedItemIds}
                  handleSelectChange={handleSelectChange}
                  defaultNodeIcon={defaultNodeIcon}
                  defaultLeafIcon={defaultLeafIcon}
                  handleDragStart={handleDragStart}
                  handleDrop={handleDrop}
                  draggedItem={draggedItem}
                />
              ) : (
                <TreeLeaf
                  item={item}
                  selectedItemId={selectedItemId}
                  handleSelectChange={handleSelectChange}
                  defaultLeafIcon={defaultLeafIcon}
                  handleDragStart={handleDragStart}
                  handleDrop={handleDrop}
                  draggedItem={draggedItem}
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }
);
TreeItem.displayName = 'TreeItem';

const TreeNode = ({
  item,
  handleSelectChange,
  expandedItemIds,
  selectedItemId,
  defaultNodeIcon,
  defaultLeafIcon,
  handleDragStart,
  handleDrop,
  draggedItem,
}: {
  item: TreeDataItem;
  handleSelectChange: (item: TreeDataItem | undefined) => void;
  expandedItemIds: string[];
  selectedItemId?: string;
  defaultNodeIcon?: any;
  defaultLeafIcon?: any;
  handleDragStart?: (item: TreeDataItem) => void;
  handleDrop?: (item: TreeDataItem) => void;
  draggedItem: TreeDataItem | null;
}) => {
  const [value, setValue] = React.useState(expandedItemIds.includes(item.id) ? [item.id] : []);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const onDragStart = (e: React.DragEvent) => {
    if (!item.draggable) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.setData('text/plain', item.id);
    handleDragStart?.(item);
  };

  const onDragOver = (e: React.DragEvent) => {
    if (item.droppable !== false && draggedItem && draggedItem.id !== item.id) {
      e.preventDefault();
      setIsDragOver(true);
    }
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleDrop?.(item);
  };

  return (
    <AccordionPrimitive.Root type="multiple" value={value} onValueChange={(s) => setValue(s)}>
      <AccordionPrimitive.Item value={item.id}>
        <AccordionTrigger
          className={cn(
            treeVariants(),
            selectedItemId === item.id && selectedTreeVariants(),
            isDragOver && dragOverVariants()
          )}
          onClick={() => {
            handleSelectChange(item);
            item.onClick?.();
          }}
          draggable={!!item.draggable}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div className="flex items-center gap-2">
            <TreeIcon
              item={item}
              isSelected={selectedItemId === item.id}
              isOpen={value.includes(item.id)}
              default={defaultNodeIcon}
            />
            <span className="text-label-sm text-text-strong">{item.name}</span>
          </div>
          <TreeActions isSelected={selectedItemId === item.id}>{item.actions}</TreeActions>
        </AccordionTrigger>
        <AccordionContent className="ml-5">
          <TreeItem
            data={item.children ? item.children : item}
            selectedItemId={selectedItemId}
            handleSelectChange={handleSelectChange}
            expandedItemIds={expandedItemIds}
            defaultLeafIcon={defaultLeafIcon}
            defaultNodeIcon={defaultNodeIcon}
            handleDragStart={handleDragStart}
            handleDrop={handleDrop}
            draggedItem={draggedItem}
          />
        </AccordionContent>
      </AccordionPrimitive.Item>
    </AccordionPrimitive.Root>
  );
};

const TreeLeaf = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    item: TreeDataItem;
    selectedItemId?: string;
    handleSelectChange: (item: TreeDataItem | undefined) => void;
    defaultLeafIcon?: any;
    handleDragStart?: (item: TreeDataItem) => void;
    handleDrop?: (item: TreeDataItem) => void;
    draggedItem: TreeDataItem | null;
  }
>(
  (
    {
      className,
      item,
      selectedItemId,
      handleSelectChange,
      defaultLeafIcon,
      handleDragStart,
      handleDrop,
      draggedItem,
      ...props
    },
    ref
  ) => {
    const [isDragOver, setIsDragOver] = React.useState(false);

    const onDragStart = (e: React.DragEvent) => {
      if (!item.draggable || item.disabled) {
        e.preventDefault();
        return;
      }

      e.dataTransfer.setData('text/plain', item.id);
      handleDragStart?.(item);
    };

    const onDragOver = (e: React.DragEvent) => {
      if (item.droppable !== false && !item.disabled && draggedItem && draggedItem.id !== item.id) {
        e.preventDefault();
        setIsDragOver(true);
      }
    };

    const onDragLeave = () => {
      setIsDragOver(false);
    };

    const onDrop = (e: React.DragEvent) => {
      if (item.disabled) return;
      e.preventDefault();
      setIsDragOver(false);
      handleDrop?.(item);
    };

    return (
      <div
        ref={ref}
        className={cn(
          'ml-10 flex cursor-pointer items-center text-left',
          treeVariants(),
          className,
          selectedItemId === item.id && selectedTreeVariants(),
          isDragOver && dragOverVariants(),
          item.disabled && 'pointer-events-none cursor-not-allowed opacity-50'
        )}
        onClick={() => {
          if (item.disabled) return;
          handleSelectChange(item);
          item.onClick?.();
        }}
        draggable={!!item.draggable && !item.disabled}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        {...props}
      >
        <div className="flex items-center gap-2">
          <div className="h-4 w-4" />
          <TreeIcon item={item} isSelected={selectedItemId === item.id} default={defaultLeafIcon} />
          <span className="text-label-sm text-text-sub">{item.name}</span>
        </div>
        <TreeActions isSelected={selectedItemId === item.id && !item.disabled}>{item.actions}</TreeActions>
      </div>
    );
  }
);
TreeLeaf.displayName = 'TreeLeaf';

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header>
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn('flex w-full flex-1 items-center transition-all', className)}
      {...props}
    >
      {children}
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm transition-all',
      className
    )}
    {...props}
  >
    <div className="pb-1 pt-0">{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

const TreeIcon = ({
  item,
  isOpen,
  isSelected,
  default: defaultIcon,
}: {
  item: TreeDataItem;
  isOpen?: boolean;
  isSelected?: boolean;
  default?: any;
}) => {
  // For nodes with children, show chevron based on open state
  if (item.children && item.children.length > 0) {
    if (isOpen && item.openIcon) {
      return item.openIcon;
    } else if (!isOpen && item.selectedIcon) {
      return item.selectedIcon;
    }
  }

  // For leaf nodes or when no specific icon is provided
  if (item.icon) {
    return item.icon;
  }

  return defaultIcon || null;
};

const TreeActions = ({ children, isSelected }: { children: React.ReactNode; isSelected: boolean }) => {
  return <div className={cn(isSelected ? 'block' : 'hidden', 'absolute right-3 group-hover:block')}>{children}</div>;
};

export { TreeView, type TreeDataItem };
