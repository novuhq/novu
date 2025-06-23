import { ReactEventHandler } from 'react';
import { RiSearchLine } from 'react-icons/ri';
import { Button } from './primitives/button';

export const ListNoResults = ({
  title,
  description,
  onClearFilters,
}: {
  title: string;
  description: string;
  onClearFilters?: ReactEventHandler<HTMLButtonElement>;
}) => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
          <RiSearchLine className="size-6 text-neutral-600" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-foreground-900 block font-medium">{title}</h3>
          <p className="text-foreground-400 max-w-[60ch] text-sm">{description}</p>
        </div>
      </div>
      {onClearFilters && (
        <Button variant="secondary" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
};
