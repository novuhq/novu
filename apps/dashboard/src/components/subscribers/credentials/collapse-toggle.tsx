import { RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri';

type CollapseToggleProps = {
  expanded: boolean;
  totalCount: number;
  onToggle: () => void;
};

export function CollapseToggle({ expanded, totalCount, onToggle }: CollapseToggleProps) {
  return (
    <button
      type="button"
      className="text-label-xs text-text-sub hover:text-text-strong flex items-center justify-center gap-1 rounded-md py-1 transition duration-200 ease-out"
      onClick={onToggle}
    >
      {expanded ? (
        <>
          <RiArrowUpSLine className="size-3.5" />
          Show less
        </>
      ) : (
        <>
          <RiArrowDownSLine className="size-3.5" />
          Show all ({totalCount})
        </>
      )}
    </button>
  );
}
