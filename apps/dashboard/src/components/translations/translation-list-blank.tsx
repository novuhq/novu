import { LinkButton } from '@/components/primitives/button-link';
import { RiBookMarkedLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { EmptyTranslationsIllustration } from './empty-translations-illustration';

export const TranslationListBlank = () => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6">
      <EmptyTranslationsIllustration />

      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-text-sub text-label-md block font-medium">No translations yet</span>
        <p className="text-text-soft text-paragraph-sm max-w-[60ch]">
          To start sending notifications in multiple languages, enable translations in your workflows. Once enabled,
          you’ll be able to add and manage localized content here.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Link to="https://docs.novu.co/platform/translations" target="_blank">
          <LinkButton variant="gray" trailingIcon={RiBookMarkedLine}>
            View docs
          </LinkButton>
        </Link>
      </div>
    </div>
  );
};
