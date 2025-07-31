import {
  RiAddLine,
  RiArrowDownSLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBin2Line,
  RiEdit2Line,
  RiFileCopyLine,
} from 'react-icons/ri';

export const JSON_EDITOR_ICONS = {
  add: <RiAddLine className="hover:text-feature size-3 transition-all duration-200 hover:scale-110" />,
  edit: <RiEdit2Line className="hover:text-feature size-3 transition-all duration-200 hover:scale-110" />,
  delete: <RiDeleteBin2Line className="hover:text-destructive size-4 transition-all duration-200 hover:scale-110" />,
  copy: <RiFileCopyLine className="hover:text-feature size-3 transition-all duration-200 hover:scale-110" />,
  ok: (
    <RiCheckLine className="size-4 text-green-500 transition-all duration-200 hover:scale-110 hover:rounded-full hover:bg-green-100 hover:p-0.5" />
  ),
  cancel: (
    <RiCloseLine className="size-4 text-red-500 transition-all duration-200 hover:scale-110 hover:rounded-full hover:bg-red-100 hover:p-0.5" />
  ),
  chevron: <RiArrowDownSLine className="hover:text-feature size-3 transition-all duration-200 hover:scale-110" />,
};
