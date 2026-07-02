import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useState } from 'react';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { CollapseToggle } from './collapse-toggle';

const COLLAPSED_ITEM_COUNT = 3;

type CredentialItemsCardProps<Item> = {
  providerId: string;
  displayName: string;
  items: Item[];
  renderItem: (item: Item, index: number) => ReactNode;
  /** Header affordance (button or menu) for adding a credential. */
  addControl?: ReactNode;
  /** Inline editor shown as the first row while adding; `null`/`undefined` when not adding. */
  addEditor?: ReactNode;
  emptyLabel?: string;
};

/**
 * Card shell shared by push and chat integrations: provider header + optional add control,
 * an animated add editor, the empty state, and a collapse toggle past {@link COLLAPSED_ITEM_COUNT}.
 */
export function CredentialItemsCard<Item>({
  providerId,
  displayName,
  items,
  renderItem,
  addControl,
  addEditor,
  emptyLabel = 'Credentials not set',
}: CredentialItemsCardProps<Item>) {
  const [showAll, setShowAll] = useState(false);

  const canCollapse = items.length > COLLAPSED_ITEM_COUNT;
  const visibleItems = canCollapse ? items.slice(0, COLLAPSED_ITEM_COUNT) : items;
  const extraItems = canCollapse ? items.slice(COLLAPSED_ITEM_COUNT) : [];
  const isEmpty = items.length === 0 && !addEditor;

  return (
    <div className="bg-bg-weak flex w-full flex-col gap-1.5 rounded-lg p-1.5">
      <div className="flex min-h-7 items-center gap-1.5 px-0.5">
        <ProviderIcon providerId={providerId} providerDisplayName={displayName} className="size-5 shrink-0" />
        <span className="text-label-xs truncate font-medium text-text-strong">{displayName}</span>
        {addControl}
      </div>

      <AnimatePresence initial={false}>
        {addEditor && (
          <motion.div
            key="add-editor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {addEditor}
          </motion.div>
        )}
      </AnimatePresence>

      {isEmpty && (
        <div className="border-stroke-soft bg-bg-white flex items-center rounded border border-dashed px-2 py-2">
          <span className="text-[10px] leading-4 text-text-soft">{emptyLabel}</span>
        </div>
      )}

      {visibleItems.map((item, index) => renderItem(item, index))}

      <AnimatePresence initial={false}>
        {showAll && extraItems.length > 0 && (
          <motion.div
            key="extra"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col gap-1.5 overflow-hidden"
          >
            {extraItems.map((item, index) => renderItem(item, index + COLLAPSED_ITEM_COUNT))}
          </motion.div>
        )}
      </AnimatePresence>

      {canCollapse && (
        <CollapseToggle expanded={showAll} totalCount={items.length} onToggle={() => setShowAll((prev) => !prev)} />
      )}
    </div>
  );
}
