import { RiArrowRightSLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { StatusBadge } from '@/components/primitives/status-badge';
import { FlagCircle } from '@/components/flag-circle';
import { cn } from '@/utils/ui';
import { DATE_FORMAT_OPTIONS, TIME_FORMAT_OPTIONS } from '../constants';
import { getLocaleDisplayName, formatTranslationDate, formatTranslationTime } from '../utils';

type TranslationStatusProps = {
  updatedAt: string;
};

function TranslationStatus({ updatedAt }: TranslationStatusProps) {
  return (
    <div className="flex flex-col items-start gap-3 self-stretch border-b border-neutral-100 p-4">
      <div className="flex w-full items-center justify-between">
        <span className="text-sm text-neutral-600">Status</span>
        <StatusBadge variant="light" status="completed" className="text-xs">
          <div
            className={cn(
              'relative size-1.5 animate-[pulse-shadow_1s_ease-in-out_infinite] rounded-full',
              'bg-success [--pulse-color:var(--success)]'
            )}
          />
          Up-to-date
        </StatusBadge>
      </div>
      <div className="flex w-full items-center justify-between">
        <span className="text-sm text-neutral-600">Last updated at</span>
        <span className="font-code text-xs text-neutral-400">
          {formatTranslationDate(updatedAt, DATE_FORMAT_OPTIONS)}{' '}
          {formatTranslationTime(updatedAt, TIME_FORMAT_OPTIONS)} UTC
        </span>
      </div>
    </div>
  );
}

type LocaleButtonProps = {
  locale: string;
  isSelected: boolean;
  onClick: () => void;
};

function LocaleButton({ locale, isSelected, onClick }: LocaleButtonProps) {
  const displayName = getLocaleDisplayName(locale);

  return (
    <Button
      variant="secondary"
      mode="outline"
      className={cn(
        'h-10 w-full justify-start gap-3 px-3 py-2 text-sm font-normal',
        isSelected ? 'border-neutral-200 bg-neutral-50' : 'border-neutral-100'
      )}
      onClick={onClick}
      trailingIcon={RiArrowRightSLine}
    >
      <FlagCircle locale={locale} size="md" />
      <span className="font-medium text-neutral-900">{locale}</span>
      <span className="text-neutral-500"> ({displayName})</span>
      <span className="ml-auto" />
    </Button>
  );
}

type LocaleListProps = {
  locales: string[];
  selectedLocale: string | null;
  onLocaleSelect: (locale: string) => void;
  updatedAt: string;
  hasUnsavedChanges?: boolean;
  onUnsavedChangesCheck?: (action: () => void) => void;
};

export function LocaleList({
  locales,
  selectedLocale,
  onLocaleSelect,
  updatedAt,
  hasUnsavedChanges = false,
  onUnsavedChangesCheck,
}: LocaleListProps) {
  const handleLocaleClick = (locale: string) => {
    if (hasUnsavedChanges && onUnsavedChangesCheck) {
      onUnsavedChangesCheck(() => onLocaleSelect(locale));
    } else {
      onLocaleSelect(locale);
    }
  };

  return (
    <div className="w-[400px] border-r border-neutral-200">
      <TranslationStatus updatedAt={updatedAt} />

      <div className="p-4">
        {!locales.length ? (
          <div className="p-4 text-center text-sm text-neutral-500">No locales found</div>
        ) : (
          <div className="space-y-2">
            {locales.map((locale) => (
              <LocaleButton
                key={locale}
                locale={locale}
                isSelected={selectedLocale === locale}
                onClick={() => handleLocaleClick(locale)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
