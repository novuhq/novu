import { DEFAULT_LOCALE } from '@novu/shared';
import { Badge } from '@/components/primitives/badge';
import { VariablePreview } from '@/components/variable/components/variable-preview';

interface NewTranslationKeyPreviewProps {
  onCreateClick?: () => void;
  locale?: string;
  translationsUrl?: string;
}

export function NewTranslationKeyPreview({
  onCreateClick,
  locale = DEFAULT_LOCALE,
  translationsUrl = '/translations',
}: NewTranslationKeyPreviewProps) {
  return (
    <VariablePreview className="min-w-[300px]">
      <VariablePreview.Content>
        <div className="text-text-sub text-paragraph-2xs font-medium leading-normal">
          <Badge variant="lighter" color="orange" size="sm" className="mb-2">
            💡 TIP
          </Badge>
          <p>
            Adds a new translation key to {locale}.json. This makes the translations outdated, update the translations
            by:
          </p>
          <ul className="mt-1 list-disc pl-3">
            <li>Exporting the updated {locale}.json</li>
            <li>Translating the new key(s)</li>
            <li>Re-uploading each localized file</li>
          </ul>
          {onCreateClick && (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onCreateClick();
              }}
              className="text-text-sub mt-2 block text-[10px] font-medium leading-normal underline"
            >
              Insert & manage translations ↗
            </a>
          )}
          {!onCreateClick && (
            <a
              href={translationsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-sub mt-2 block text-[10px] font-medium leading-normal underline"
            >
              Manage translations ↗
            </a>
          )}
        </div>
      </VariablePreview.Content>
    </VariablePreview>
  );
}
