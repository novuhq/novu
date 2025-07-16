import { useMemo } from 'react';
import { RiAlertFill, RiArrowRightSLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Badge } from '@/components/primitives/badge';
import { FlagCircle } from '@/components/flag-circle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';
import { DATE_FORMAT_OPTIONS, TIME_FORMAT_OPTIONS } from '../constants';
import { getLocaleDisplayName, formatTranslationDate, formatTranslationTime } from '../utils';
import { TranslationStatus } from '../translation-status';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { DEFAULT_LOCALE } from '@novu/shared';

type TranslationStatusSectionProps = {
  updatedAt: string;
  outdatedLocales?: string[];
};

function TranslationStatusSection({ updatedAt, outdatedLocales }: TranslationStatusSectionProps) {
  return (
    <div className="flex flex-col items-start gap-3 self-stretch border-b border-neutral-100 p-4">
      <div className="flex w-full items-center justify-between">
        <span className="text-sm text-neutral-600">Status</span>
        <TranslationStatus outdatedLocales={outdatedLocales} className="text-xs" />
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
  isDefault?: boolean;
  isOutdated?: boolean;
  onClick: () => void;
};

function LocaleButton({ locale, isSelected, isDefault, isOutdated, onClick }: LocaleButtonProps) {
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
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <span className="text-sm font-medium text-neutral-900">{locale}</span>
        <span className="truncate text-xs text-neutral-500">({displayName})</span>
      </div>
      <div className="flex items-center gap-2">
        {isOutdated && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="inline-flex cursor-help items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <RiAlertFill className="text-warning-base size-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <span className="text-xs">
                Some keys in this target locale don't match the default locale. Add missing keys or remove extra ones to
                sync translations.
              </span>
            </TooltipContent>
          </Tooltip>
        )}
        {isDefault && (
          <Badge variant="lighter" color="orange" size="md">
            DEFAULT
          </Badge>
        )}
      </div>
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
  outdatedLocales?: string[];
};

export function LocaleList({
  locales,
  selectedLocale,
  onLocaleSelect,
  updatedAt,
  hasUnsavedChanges = false,
  onUnsavedChangesCheck,
  outdatedLocales,
}: LocaleListProps) {
  const { data: organizationSettings } = useFetchOrganizationSettings();
  const actualDefaultLocale = organizationSettings?.data?.defaultLocale || DEFAULT_LOCALE;

  const handleLocaleClick = (locale: string) => {
    if (hasUnsavedChanges && onUnsavedChangesCheck) {
      onUnsavedChangesCheck(() => onLocaleSelect(locale));
    } else {
      onLocaleSelect(locale);
    }
  };

  // Sort locales to put default locale first
  const sortedLocales = useMemo(() => {
    if (!locales || !Array.isArray(locales)) return [];
    if (!actualDefaultLocale) return locales;

    const defaultIndex = locales.indexOf(actualDefaultLocale);
    if (defaultIndex === -1) return locales;

    // Move default locale to the front
    return [actualDefaultLocale, ...locales.filter((locale) => locale !== actualDefaultLocale)];
  }, [locales, actualDefaultLocale]);

  return (
    <div className="w-[400px] border-r border-neutral-200">
      <TranslationStatusSection updatedAt={updatedAt} outdatedLocales={outdatedLocales} />

      <div className="p-4">
        {!locales.length ? (
          <div className="p-4 text-center text-sm text-neutral-500">No locales found</div>
        ) : (
          <div className="space-y-2">
            {sortedLocales.map((locale) => (
              <LocaleButton
                key={locale}
                locale={locale}
                isSelected={selectedLocale === locale}
                isDefault={locale === actualDefaultLocale}
                isOutdated={outdatedLocales?.includes(locale)}
                onClick={() => handleLocaleClick(locale)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
