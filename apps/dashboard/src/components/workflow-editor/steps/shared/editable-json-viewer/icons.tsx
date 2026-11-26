import type { ReactElement } from 'react';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBin2Line,
  RiEdit2Line,
  RiFileCopyLine,
} from 'react-icons/ri';

/**
 * json-edit-react puts each icon in a plain clickable div, which keyboards, screen readers and test agents can't
 * find. A real button inside it can be named and focused, and its click still reaches the library's handler.
 */
function asButton(label: string, icon: ReactElement) {
  return (
    <button type="button" aria-label={label} className="flex cursor-pointer items-center">
      {icon}
    </button>
  );
}

export const JSON_EDITOR_ICONS = {
  add: asButton('Add', <RiAddLine className="hover:text-feature size-3 transition-all duration-200 hover:scale-110" />),
  edit: asButton(
    'Edit',
    <RiEdit2Line className="hover:text-feature size-3 transition-all duration-200 hover:scale-110" />
  ),
  delete: asButton(
    'Delete',
    <RiDeleteBin2Line className="hover:text-destructive size-4 transition-all duration-200 hover:scale-110" />
  ),
  copy: asButton(
    'Copy',
    <RiFileCopyLine className="hover:text-feature size-3 transition-all duration-200 hover:scale-110" />
  ),
  ok: asButton(
    'Apply',
    <RiCheckLine className="size-4 text-green-500 transition-all duration-200 hover:scale-110 hover:rounded-full hover:bg-green-100 hover:p-0.5" />
  ),
  cancel: asButton(
    'Cancel',
    <RiCloseLine className="size-4 text-red-500 transition-all duration-200 hover:scale-110 hover:rounded-full hover:bg-red-100 hover:p-0.5" />
  ),
  chevron: <RiArrowDownSLine className="hover:text-feature size-3 transition-all duration-200 hover:scale-110" />,
};
