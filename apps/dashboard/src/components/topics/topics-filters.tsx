import { Button } from '@/components/primitives/button';
import { cn } from '@/utils/ui';
import { ChangeEvent, HTMLAttributes, useState } from 'react';
import { RiSearchLine } from 'react-icons/ri';
import { TopicsFilter } from './hooks/use-topics-url-state';

interface TopicsFiltersProps extends HTMLAttributes<HTMLDivElement> {
  onFiltersChange: (filters: Partial<TopicsFilter>) => void;
  filterValues: TopicsFilter;
  onReset: () => void;
}

export const TopicsFilters = (props: TopicsFiltersProps) => {
  const { className, onFiltersChange, filterValues, onReset, ...rest } = props;
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearch = () => {
    onFiltersChange({
      key: searchTerm,
      name: searchTerm,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleReset = () => {
    setSearchTerm('');
    onReset();
  };

  const areFiltersApplied = filterValues.key || filterValues.name;

  return (
    <div className={cn('flex items-center gap-2', className)} {...rest}>
      <div className="relative">
        <input
          type="text"
          placeholder="Search topics..."
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          className="border-foreground-200 focus:ring-primary w-[300px] rounded-md border px-3 py-1.5 pl-8 text-sm focus:outline-none focus:ring-1"
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
          <RiSearchLine className="text-foreground-400 h-4 w-4" />
        </div>
      </div>
      <Button variant="primary" size="xs" onClick={handleSearch}>
        Search
      </Button>
      {areFiltersApplied && (
        <Button variant="secondary" size="xs" onClick={handleReset}>
          Reset
        </Button>
      )}
    </div>
  );
};
